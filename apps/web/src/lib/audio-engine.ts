/**
 * Soundscape Audio Engine — Web Audio API Synthesis
 *
 * Generates all sound layers in real-time using the Web Audio API:
 * - Pink noise (1/f spectrum)
 * - Ocean waves (filtered noise + amplitude modulation)
 * - Rain (high-pass noise with droplet impulses)
 * - Forest (band-pass noise with bird-like chirps)
 * - Soft piano (sine harmonics with ADSR envelope)
 * - Shush rhythm (amplitude-modulated noise at ~60 BPM)
 *
 * No WAV files needed. Infinite, seamless, high-quality audio.
 */

export type NatureSoundType = "ocean" | "rain" | "forest" | "none";

export interface LayerVolumes {
    pinkNoise: number; // 0-1
    nature: number;    // 0-1
    piano: number;     // 0-1
    shush: number;     // 0-1
}

interface LayerNodes {
    gainNode: GainNode;
    sourceNodes: AudioNode[];
}

export class SoundscapeEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private layers: Map<string, LayerNodes> = new Map();
    private natureType: NatureSoundType = "ocean";
    private isPlaying = false;
    private animationFrameIds: number[] = [];

    /** Start the audio engine */
    async start(volumes: LayerVolumes, natureType: NatureSoundType): Promise<void> {
        if (this.isPlaying) return;

        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.ctx.destination);
        this.natureType = natureType;

        // Create all layers
        this.createPinkNoiseLayer(volumes.pinkNoise);
        this.createNatureLayer(natureType, volumes.nature);
        this.createPianoLayer(volumes.piano);
        this.createShushLayer(volumes.shush);

        this.isPlaying = true;
    }

    /** Stop the audio engine */
    stop(): void {
        this.animationFrameIds.forEach((id) => cancelAnimationFrame(id));
        this.animationFrameIds = [];

        this.layers.forEach((layer) => {
            layer.sourceNodes.forEach((node) => {
                try {
                    if (node instanceof AudioBufferSourceNode) {
                        node.stop();
                    } else if (node instanceof OscillatorNode) {
                        node.stop();
                    }
                } catch {
                    // Already stopped
                }
            });
            layer.gainNode.disconnect();
        });
        this.layers.clear();

        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
        this.masterGain = null;
        this.isPlaying = false;
    }

    /** Update individual layer volume */
    setLayerVolume(layer: keyof LayerVolumes, volume: number): void {
        const layerNodes = this.layers.get(layer);
        if (layerNodes) {
            layerNodes.gainNode.gain.setTargetAtTime(
                volume,
                this.ctx?.currentTime || 0,
                0.1
            );
        }
    }

    /** Update all volumes at once */
    setVolumes(volumes: LayerVolumes): void {
        this.setLayerVolume("pinkNoise", volumes.pinkNoise);
        this.setLayerVolume("nature", volumes.nature);
        this.setLayerVolume("piano", volumes.piano);
        this.setLayerVolume("shush", volumes.shush);
    }

    /** Switch nature sound type while playing */
    switchNature(type: NatureSoundType): void {
        if (this.natureType === type) return;

        // Fade out old nature
        const oldNature = this.layers.get("nature");
        if (oldNature) {
            oldNature.gainNode.gain.setTargetAtTime(0, this.ctx?.currentTime || 0, 0.5);
            setTimeout(() => {
                oldNature.sourceNodes.forEach((n) => {
                    try {
                        if (n instanceof AudioBufferSourceNode) n.stop();
                        else if (n instanceof OscillatorNode) n.stop();
                    } catch { /* ok */ }
                });
                oldNature.gainNode.disconnect();
                this.layers.delete("nature");

                // Create new nature layer
                this.natureType = type;
                const currentVol = oldNature.gainNode.gain.value || 0.4;
                this.createNatureLayer(type, currentVol);
            }, 600);
        } else {
            this.natureType = type;
        }
    }

    get playing(): boolean {
        return this.isPlaying;
    }

    // ─── Layer Creators ─────────────────────────────────────────

    private createPinkNoiseLayer(volume: number): void {
        if (!this.ctx || !this.masterGain) return;

        const bufferSize = 2 * this.ctx.sampleRate; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Pink noise using Paul Kellet's refined method
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
            b6 = white * 0.115926;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();

        this.layers.set("pinkNoise", { gainNode: gain, sourceNodes: [source] });
    }

    private createNatureLayer(type: NatureSoundType, volume: number): void {
        if (!this.ctx || !this.masterGain || type === "none") return;

        switch (type) {
            case "ocean":
                this.createOceanLayer(volume);
                break;
            case "rain":
                this.createRainLayer(volume);
                break;
            case "forest":
                this.createForestLayer(volume);
                break;
        }
    }

    private createOceanLayer(volume: number): void {
        if (!this.ctx || !this.masterGain) return;

        // Ocean = filtered noise with slow wave-like amplitude modulation
        const bufferSize = 4 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate brownian-ish noise for ocean base
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.02 * white) / 1.02;
            data[i] = lastOut * 3.5;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Low-pass filter for deep ocean sound
        const lpf = this.ctx.createBiquadFilter();
        lpf.type = "lowpass";
        lpf.frequency.value = 400;
        lpf.Q.value = 0.7;

        // Amplitude modulation for wave rhythm (~0.1 Hz = 10s waves)
        const lfo = this.ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.08; // ~12 second wave cycle

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.3; // Modulation depth

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        source.connect(lpf);
        lpf.connect(gain);
        gain.connect(this.masterGain);

        source.start();
        lfo.start();

        this.layers.set("nature", { gainNode: gain, sourceNodes: [source, lfo] });
    }

    private createRainLayer(volume: number): void {
        if (!this.ctx || !this.masterGain) return;

        // Rain = high-frequency filtered noise with subtle variations
        const bufferSize = 4 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Add occasional "droplet" impulses
            const droplet = Math.random() > 0.9995 ? (Math.random() * 0.4) : 0;
            data[i] = white * 0.3 + droplet;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Band-pass for rain-like frequencies
        const bpf = this.ctx.createBiquadFilter();
        bpf.type = "bandpass";
        bpf.frequency.value = 3000;
        bpf.Q.value = 0.3;

        // Slight high shelf for shimmer
        const shelf = this.ctx.createBiquadFilter();
        shelf.type = "highshelf";
        shelf.frequency.value = 5000;
        shelf.gain.value = -6;

        // Gentle LFO for intensity variation
        const lfo = this.ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.05; // ~20 second cycle

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.15;

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        source.connect(bpf);
        bpf.connect(shelf);
        shelf.connect(gain);
        gain.connect(this.masterGain);

        source.start();
        lfo.start();

        this.layers.set("nature", { gainNode: gain, sourceNodes: [source, lfo] });
    }

    private createForestLayer(volume: number): void {
        if (!this.ctx || !this.masterGain) return;

        // Forest = soft rustling noise + gentle bird-like chirps
        const bufferSize = 4 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Gentle rustling base
        let prev = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            prev = prev * 0.7 + white * 0.3;
            data[i] = prev * 0.25;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Band-pass for leaf-rustling frequencies
        const bpf = this.ctx.createBiquadFilter();
        bpf.type = "bandpass";
        bpf.frequency.value = 1200;
        bpf.Q.value = 0.5;

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        source.connect(bpf);
        bpf.connect(gain);
        gain.connect(this.masterGain);
        source.start();

        // Add gentle bird chirps (high-frequency sine pings)
        const sourceNodes: AudioNode[] = [source];

        // Schedule random chirps using oscillators
        const createChirp = () => {
            if (!this.ctx || !this.masterGain || !this.isPlaying) return;

            const chirp = this.ctx.createOscillator();
            chirp.type = "sine";
            const baseFreq = 2000 + Math.random() * 2000; // 2000-4000 Hz
            chirp.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
            chirp.frequency.exponentialRampToValueAtTime(
                baseFreq * 1.3,
                this.ctx.currentTime + 0.08
            );
            chirp.frequency.exponentialRampToValueAtTime(
                baseFreq * 0.8,
                this.ctx.currentTime + 0.15
            );

            const chirpGain = this.ctx.createGain();
            chirpGain.gain.setValueAtTime(0, this.ctx.currentTime);
            chirpGain.gain.linearRampToValueAtTime(
                0.02 * volume,
                this.ctx.currentTime + 0.02
            );
            chirpGain.gain.exponentialRampToValueAtTime(
                0.001,
                this.ctx.currentTime + 0.2
            );

            chirp.connect(chirpGain);
            chirpGain.connect(gain);

            chirp.start();
            chirp.stop(this.ctx.currentTime + 0.25);

            // Schedule next chirp
            const nextDelay = 3000 + Math.random() * 8000; // 3-11 seconds
            const timeoutId = setTimeout(createChirp, nextDelay);
            // Store for cleanup
            chirp.onended = () => clearTimeout(timeoutId);
        };

        // Start first chirp after a short delay
        setTimeout(createChirp, 2000);

        this.layers.set("nature", { gainNode: gain, sourceNodes });
    }

    private createPianoLayer(volume: number): void {
        if (!this.ctx || !this.masterGain) return;

        // Soft piano pad — C major chord with gentle sine harmonics
        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        const sourceNodes: OscillatorNode[] = [];

        // C major chord notes (fundamental frequencies)
        // C3, E3, G3, C4 for a warm, soothing pad
        const notes = [130.81, 164.81, 196.00, 261.63];
        const harmonicVolumes = [0.08, 0.06, 0.05, 0.03];

        notes.forEach((freq, idx) => {
            // Fundamental
            const osc = this.ctx!.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;

            const oscGain = this.ctx!.createGain();
            oscGain.gain.value = harmonicVolumes[idx];

            // Add slight detuning for warmth
            osc.detune.value = (Math.random() - 0.5) * 8; // ±4 cents

            osc.connect(oscGain);
            oscGain.connect(gain);
            osc.start();
            sourceNodes.push(osc);

            // Add soft overtone
            const overtone = this.ctx!.createOscillator();
            overtone.type = "sine";
            overtone.frequency.value = freq * 2;
            overtone.detune.value = (Math.random() - 0.5) * 6;

            const overtoneGain = this.ctx!.createGain();
            overtoneGain.gain.value = harmonicVolumes[idx] * 0.25;

            overtone.connect(overtoneGain);
            overtoneGain.connect(gain);
            overtone.start();
            sourceNodes.push(overtone);
        });

        // Gentle pulsing LFO for organic feel
        const lfo = this.ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.15; // Very slow breath-like pulsing

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.02;

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();
        sourceNodes.push(lfo);

        gain.connect(this.masterGain);

        this.layers.set("piano", { gainNode: gain, sourceNodes });
    }

    private createShushLayer(volume: number): void {
        if (!this.ctx || !this.masterGain) return;

        // Shush rhythm = amplitude-modulated noise at ~60 BPM
        const bufferSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Band-pass for shush-like frequencies
        const bpf = this.ctx.createBiquadFilter();
        bpf.type = "bandpass";
        bpf.frequency.value = 2500;
        bpf.Q.value = 0.8;

        // Amplitude modulation at 1 Hz (60 BPM) for "shh... shh... shh..."
        const lfo = this.ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 1.0; // 60 BPM

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.5; // Full depth modulation

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        source.connect(bpf);
        bpf.connect(gain);
        gain.connect(this.masterGain);

        source.start();
        lfo.start();

        this.layers.set("shush", { gainNode: gain, sourceNodes: [source, lfo] });
    }
}
