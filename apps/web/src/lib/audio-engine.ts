/**
 * Velvet Atmos Audio Engine — v3
 *
 * Changes over v2:
 * - Seeded LCG PRNG replaces Math.random() → guaranteed decorrelation per channel, no
 *   entropy collision between buffers generated on the same tick.
 * - scheduleTimeout() / clearAllTimers() — every recursive setTimeout is tracked so
 *   stop() cancels all pending piano notes, forest chirps, and whale calls immediately.
 *   In v2 those callbacks kept firing after stop(), leaking AudioNodes until GC.
 * - Ocean DC protection: baseGain offset added as a ConstantSourceNode so the LFO sum
 *   can never push gain.gain below 0 (negative gain = polarity flip + click).
 * - Forest cricket band lowered 4 kHz → 2.2 kHz, Q 3 → 1.8 — 4 kHz is piercing on
 *   phone speakers and harsh for infant hearing.
 * - Piano decay extended (3–6 s), inter-note gap widened (4–9 s) — less intrusive.
 * - Heartbeat: volume is now clamped per-beat from the current layer gain value so
 *   setLayerVolume() changes are reflected immediately without a restart.
 * - createPinkNoiseBuffer() takes an explicit seed integer instead of a skip-N-samples loop.
 */

export type NatureSoundType = "ocean" | "rain" | "forest" | "whale" | "crickets" | "none";

export interface LayerVolumes {
    pinkNoise: number;
    nature: number;
    piano: number;
    shush: number;
    heartbeat: number;
}

interface LayerNodes {
    gainNode: GainNode;
    sourceNodes: (AudioBufferSourceNode | OscillatorNode | ConstantSourceNode)[];
    filterChain?: BiquadFilterNode[];
}

export class SoundscapeEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private muffleFilter: BiquadFilterNode | null = null;
    private layers: Map<string, LayerNodes> = new Map();
    private natureType: NatureSoundType = "ocean";
    private isPlaying = false;
    private isMuffled = false;
    private hbInterval: ReturnType<typeof setInterval> | null = null;
    private static bufferCache: Map<string, AudioBuffer> = new Map();

    /** All scheduled timeouts — cleared atomically on stop() */
    private pendingTimers: Set<ReturnType<typeof setTimeout>> = new Set();

    // ─── Public API ──────────────────────────────────────────────────────────

    async start(
        volumes: LayerVolumes,
        natureType: NatureSoundType,
        muffled = false
    ): Promise<void> {
        if (this.isPlaying) return;

        this.ctx = new AudioContext();
        this.isMuffled = muffled;

        this.muffleFilter = this.ctx.createBiquadFilter();
        this.muffleFilter.type = "lowpass";
        this.muffleFilter.frequency.value = muffled ? 500 : 20000;
        this.muffleFilter.Q.value = 0.3;

        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-18, this.ctx.currentTime);
        comp.knee.setValueAtTime(30, this.ctx.currentTime);
        comp.ratio.setValueAtTime(4, this.ctx.currentTime);
        comp.attack.setValueAtTime(0.01, this.ctx.currentTime);
        comp.release.setValueAtTime(0.5, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.75;

        this.muffleFilter.connect(comp);
        comp.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.natureType = natureType;

        this.createNoiseLayer(volumes.pinkNoise);
        this.createNatureLayer(natureType, volumes.nature);
        this.createPianoLayer(volumes.piano);
        this.createShushLayer(volumes.shush);
        this.createHeartbeatLayer(volumes.heartbeat);

        this.isPlaying = true;
    }

    stop(): void {
        this.isPlaying = false;

        // Cancel every pending callback before disconnecting nodes
        this.clearAllTimers();

        if (this.hbInterval) {
            clearInterval(this.hbInterval);
            this.hbInterval = null;
        }

        this.layers.forEach((layer) => {
            layer.sourceNodes.forEach((node) => {
                try { node.stop(); } catch { /* already stopped */ }
                try { node.disconnect(); } catch { /* already disconnected */ }
            });
            try { layer.gainNode.disconnect(); } catch { /* ok */ }
            layer.filterChain?.forEach((f) => { try { f.disconnect(); } catch { /* ok */ } });
        });
        this.layers.clear();

        if (this.ctx) {
            try {
                this.ctx.close();
            } catch { /* ok */ }
            this.ctx = null;
        }
    }

    fadeOutAndStop(durationSecs: number): void {
        if (!this.isPlaying || !this.ctx || !this.masterGain) return;
        
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSecs);
        this.masterGain.gain.linearRampToValueAtTime(0, now + durationSecs + 0.1);
        
        this.scheduleTimeout(() => {
            this.stop();
        }, (durationSecs + 0.5) * 1000);
    }

    setLayerVolume(layer: keyof LayerVolumes, volume: number): void {
        const nodes = this.layers.get(layer);
        if (nodes && this.ctx) {
            nodes.gainNode.gain.exponentialRampToValueAtTime(
                Math.max(0.0001, volume),
                this.ctx.currentTime + 0.25
            );
        }
    }

    setMuffled(muffled: boolean): void {
        if (!this.muffleFilter || !this.ctx) return;
        this.isMuffled = muffled;
        this.muffleFilter.frequency.exponentialRampToValueAtTime(
            muffled ? 500 : 20000,
            this.ctx.currentTime + 1.0
        );
    }

    setVolumes(volumes: LayerVolumes): void {
        (Object.keys(volumes) as (keyof LayerVolumes)[]).forEach((k) =>
            this.setLayerVolume(k, volumes[k])
        );
    }

    switchNature(type: NatureSoundType): void {
        if (this.natureType === type || !this.ctx) return;
        const old = this.layers.get("nature");
        const currentTime = this.ctx.currentTime;
        if (old) {
            old.gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.8);
            this.scheduleTimeout(() => {
                old.sourceNodes.forEach((n) => {
                    try { n.stop(); } catch { /* ok */ }
                    try { n.disconnect(); } catch { /* ok */ }
                });
                try { old.gainNode.disconnect(); } catch { /* ok */ }
                old.filterChain?.forEach((f) => { try { f.disconnect(); } catch { /* ok */ } });
                this.layers.delete("nature");
                this.natureType = type;
                this.createNatureLayer(type, 0.4);
            }, 900);
        } else {
            this.natureType = type;
            this.createNatureLayer(type, 0.4);
        }
    }

    get playing(): boolean { return this.isPlaying; }

    // ─── Timer management ────────────────────────────────────────────────────

    /**
     * Wrapper around setTimeout that registers the ID so stop() can cancel it.
     * Use everywhere instead of raw setTimeout.
     */
    private scheduleTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
        const id = setTimeout(() => {
            this.pendingTimers.delete(id);
            fn();
        }, ms);
        this.pendingTimers.add(id);
        return id;
    }

    private clearAllTimers(): void {
        this.pendingTimers.forEach((id) => clearTimeout(id));
        this.pendingTimers.clear();
    }

    // ─── Noise generation ────────────────────────────────────────────────────

    private async loadBuffer(url: string): Promise<AudioBuffer | null> {
        if (SoundscapeEngine.bufferCache.has(url)) {
            return SoundscapeEngine.bufferCache.get(url)!;
        }
        if (!this.ctx) return null;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            SoundscapeEngine.bufferCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (e) {
            return null;
        }
    }

    private async playAcoustic(layerName: string, expectedNature: NatureSoundType | null, url: string, destNode: AudioNode, loop = true): Promise<boolean> {
        const buf = await this.loadBuffer(url);
        if (!buf || !this.isPlaying || !this.ctx) return false;
        if (expectedNature !== null && this.natureType !== expectedNature) return false;

        const layer = this.layers.get(layerName);
        if (!layer) return false; 
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.loop = loop;
        src.connect(destNode);
        src.start();
        layer.sourceNodes.push(src);
        return true;
    }

    /**
     * Paul Kellett pink noise using the Mulberry32 seeded PRNG.
     * Each seed produces a completely different deterministic sequence —
     * no skip-N-samples warmup needed, and no Math.random() collisions.
     */
    private createPinkNoiseBuffer(duration: number, seed: number): AudioBuffer {
        const sr = this.ctx!.sampleRate;
        const size = Math.floor(duration * sr);
        const buf = this.ctx!.createBuffer(1, size, sr);
        const d = buf.getChannelData(0);

        let s = (seed * 0x9e3779b9) >>> 0;
        const rng = (): number => {
            s = (Math.imul(s ^ (s >>> 15), s | 1)) >>> 0;
            s ^= s + (Math.imul(s ^ (s >>> 7), s | 61) >>> 0);
            return ((s ^ (s >>> 14)) >>> 0) / 0x100000000 * 2 - 1;
        };

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < size; i++) {
            const w = rng();
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616  * b5 - w * 0.0168980;
            d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.13;
            b6 = w * 0.115926;
        }
        return buf;
    }

    private loopNoisePair(
        seedA: number,
        seedB: number,
        duration: number,
        destination: AudioNode,
        filters?: BiquadFilterNode[]
    ): AudioBufferSourceNode[] {
        const sL = this.ctx!.createBufferSource();
        const sR = this.ctx!.createBufferSource();
        sL.buffer = this.createPinkNoiseBuffer(duration, seedA);
        sR.buffer = this.createPinkNoiseBuffer(duration, seedB);
        sL.loop = true; sR.loop = true;

        const entry = filters?.[0] ?? destination;
        sL.connect(entry); sR.connect(entry);
        if (filters) filters[filters.length - 1].connect(destination);

        sL.start(); sR.start();
        return [sL, sR];
    }

    private cascadeLP(cutoff: number, stages: number, q = 0.5): BiquadFilterNode[] {
        const chain: BiquadFilterNode[] = [];
        for (let i = 0; i < stages; i++) {
            const f = this.ctx!.createBiquadFilter();
            f.type = "lowpass";
            f.frequency.value = cutoff;
            f.Q.value = q;
            if (chain.length) chain[chain.length - 1].connect(f);
            chain.push(f);
        }
        return chain;
    }

    // ─── Layer implementations ───────────────────────────────────────────────

    private async createNoiseLayer(volume: number): Promise<void> {
        const gain = this.ctx!.createGain();
        gain.gain.value = volume;
        gain.connect(this.muffleFilter!);
        this.layers.set("pinkNoise", { gainNode: gain, sourceNodes: [], filterChain: [] });

        // Prefer realistic acoustic Brown/Pink noise file if available
        const acousticSuccess = await this.playAcoustic("pinkNoise", null, "/sounds/brown_noise.mp3", gain);
        if (acousticSuccess) return;
        
        if (!this.isPlaying) return;

        // Fallback: Brown-Noise filtered synthesis
        const filters = this.cascadeLP(350, 4); // Deep low pass for Brown noise profile
        const sources = this.loopNoisePair(1, 2, 8, gain, filters);

        const layer = this.layers.get("pinkNoise");
        if (layer) {
            layer.sourceNodes.push(...sources);
            layer.filterChain = filters;
        }
    }

    private createNatureLayer(type: NatureSoundType, volume: number): void {
        if (type === "none" || !this.ctx) return;

        const gain = this.ctx.createGain();
        gain.gain.value = Math.max(volume, 0.0001);
        gain.connect(this.muffleFilter!);
        this.layers.set("nature", { gainNode: gain, sourceNodes: [] });

        if      (type === "ocean")  this.buildOcean(gain, volume);
        else if (type === "rain")   this.buildRain(gain);
        else if (type === "forest") this.buildForest(gain);
        else if (type === "whale")  this.buildWhale(gain);
        else if (type === "crickets") this.buildCrickets(gain);
    }

    private async buildOcean(gain: GainNode, baseVolume: number): Promise<void> {
        const acousticSuccess = await this.playAcoustic("nature", "ocean", "/sounds/ocean.mp3", gain);
        if (acousticSuccess) return;
        if (!this.isPlaying || this.natureType !== "ocean") return;

        const filters = this.cascadeLP(320, 4, 0.4);
        const sources = this.loopNoisePair(3, 4, 12, gain, filters);

        /**
         * DC offset anchor: a ConstantSourceNode feeds +baseVolume into gain.gain.
         * LFOs modulate around that anchor so gain.gain stays above 0 at all times.
         * In v2, gain.gain.value was set once and LFOs added signed offsets, which
         * could push it negative at low volumes → polarity flip + click artefact.
         */
        gain.gain.value = 0;
        const dc = this.ctx!.createConstantSource();
        dc.offset.value = baseVolume;
        dc.connect(gain.gain);
        dc.start();

        const swellDepth = baseVolume * 0.32;
        const lfoFreqs = [0.022, 0.037, 0.059] as const;

        const lfos: OscillatorNode[] = lfoFreqs.map((freq) => {
            const lfo = this.ctx!.createOscillator();
            lfo.type = "sine";
            lfo.frequency.value = freq;
            const g = this.ctx!.createGain();
            g.gain.value = swellDepth / lfoFreqs.length;
            lfo.connect(g);
            g.connect(gain.gain);
            lfo.start();
            return lfo;
        });

        const layer = this.layers.get("nature");
        if (layer) {
            layer.sourceNodes.push(...sources, dc, ...lfos);
            layer.filterChain = filters;
        }
    }

    private async buildRain(gain: GainNode): Promise<void> {
        const acousticSuccess = await this.playAcoustic("nature", "rain", "/sounds/rain.mp3", gain);
        if (acousticSuccess) return;
        if (!this.isPlaying || this.natureType !== "rain") return;

        const hpf = this.ctx!.createBiquadFilter();
        hpf.type = "highpass"; hpf.frequency.value = 700; hpf.Q.value = 0.5;
        const lpf = this.ctx!.createBiquadFilter();
        lpf.type = "lowpass";  lpf.frequency.value = 4500; lpf.Q.value = 0.5;

        const sources = this.loopNoisePair(5, 6, 5, gain, [hpf, lpf]);

        // Soft pentatonic lullaby woven into the rain
        this.buildLullaby(gain, 0.08);

        const layer = this.layers.get("nature");
        if (layer) {
            layer.sourceNodes.push(...sources);
            layer.filterChain = [hpf, lpf];
        }
    }

    private async buildForest(gain: GainNode): Promise<void> {
        const acousticSuccess = await this.playAcoustic("nature", "forest", "/sounds/forest.mp3", gain);
        if (acousticSuccess) return;
        if (!this.isPlaying || this.natureType !== "forest") return;

        const sources: (AudioBufferSourceNode | OscillatorNode)[] = [];

        // Wind base — very low-passed for rustling-leaves character
        const windSrc = this.ctx!.createBufferSource();
        windSrc.buffer = this.createPinkNoiseBuffer(7, 7);
        windSrc.loop = true;
        const windLPF = this.ctx!.createBiquadFilter();
        windLPF.type = "lowpass"; windLPF.frequency.value = 380;
        const windGain = this.ctx!.createGain(); windGain.gain.value = 0.55;
        windSrc.connect(windLPF); windLPF.connect(windGain); windGain.connect(gain);
        windSrc.start();
        sources.push(windSrc);

        /**
         * Cricket texture: was 4 kHz Q=3 in v2 — narrow spike in the most sensitive
         * range of infant hearing (3–6 kHz). Lowered to 2.2 kHz, Q=1.8 for a softer,
         * more diffuse insect-at-dusk texture.
         */
        const cricketSrc = this.ctx!.createBufferSource();
        cricketSrc.buffer = this.createPinkNoiseBuffer(4, 8);
        cricketSrc.loop = true;
        const bpf = this.ctx!.createBiquadFilter();
        bpf.type = "bandpass"; bpf.frequency.value = 2200; bpf.Q.value = 1.8;
        const cGain = this.ctx!.createGain(); cGain.gain.value = 0.18;
        const cLFO = this.ctx!.createOscillator();
        cLFO.type = "sine"; cLFO.frequency.value = 0.7;
        const cLFOGain = this.ctx!.createGain(); cLFOGain.gain.value = 0.09;
        cLFO.connect(cLFOGain); cLFOGain.connect(cGain.gain);
        cricketSrc.connect(bpf); bpf.connect(cGain); cGain.connect(gain);
        cricketSrc.start(); cLFO.start();
        sources.push(cricketSrc, cLFO);

        // Occasional distant bird — soft, infrequent, low-passed
        const chirp = () => {
            if (!this.isPlaying || this.natureType !== "forest") return;
            const t = this.ctx!.currentTime;
            const f = 1000 + Math.random() * 600;
            const osc = this.ctx!.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, t);
            osc.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.12);
            osc.frequency.exponentialRampToValueAtTime(f * 0.88, t + 0.32);
            const env = this.ctx!.createGain();
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.05, t + 0.04);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
            const birdLPF = this.ctx!.createBiquadFilter();
            birdLPF.type = "lowpass"; birdLPF.frequency.value = 2000;
            osc.connect(birdLPF); birdLPF.connect(env); env.connect(gain);
            osc.start(t); osc.stop(t + 0.45);
            this.scheduleTimeout(chirp, 9000 + Math.random() * 18000);
        };
        this.scheduleTimeout(chirp, 4000 + Math.random() * 8000);

        const layer = this.layers.get("nature");
        if (layer) layer.sourceNodes.push(...sources);
    }

    private async buildCrickets(gain: GainNode): Promise<void> {
        const acousticSuccess = await this.playAcoustic("nature", "crickets", "/sounds/crickets.mp3", gain);
        if (acousticSuccess) return;
        if (!this.isPlaying || this.natureType !== "crickets") return;
        
        // Fallback to procedural forest crickets if file missing
        this.buildForest(gain);
    }

    private buildWhale(gain: GainNode): void {
        const rumble = this.ctx!.createOscillator();
        rumble.type = "sine"; rumble.frequency.value = 38;
        const rG = this.ctx!.createGain(); rG.gain.value = 0.055;
        rumble.connect(rG); rG.connect(gain); rumble.start();

        const scheduleCall = () => {
            if (!this.isPlaying || this.natureType !== "whale") return;
            const t = this.ctx!.currentTime;
            const base = 100 + Math.random() * 80;

            const car = this.ctx!.createOscillator();
            const mod = this.ctx!.createOscillator();
            const mG = this.ctx!.createGain();
            car.frequency.value = base;
            mod.frequency.value = base * 1.48;
            mG.gain.value = 28;

            car.frequency.exponentialRampToValueAtTime(base * 1.22, t + 4);
            car.frequency.exponentialRampToValueAtTime(base * 0.82, t + 8);

            const cG = this.ctx!.createGain();
            cG.gain.setValueAtTime(0, t);
            cG.gain.linearRampToValueAtTime(0.17, t + 2.5);
            cG.gain.exponentialRampToValueAtTime(0.0001, t + 9.5);

            const tilt = this.ctx!.createBiquadFilter();
            tilt.type = "lowpass"; tilt.frequency.value = 550;

            mod.connect(mG); mG.connect(car.frequency);
            car.connect(tilt); tilt.connect(cG); cG.connect(gain);
            car.start(t); mod.start(t);
            car.stop(t + 11); mod.stop(t + 11);

            this.scheduleTimeout(scheduleCall, 22000 + Math.random() * 18000);
        };
        scheduleCall();

        const layer = this.layers.get("nature");
        if (layer) layer.sourceNodes.push(rumble);
    }

    /**
     * Pentatonic lullaby with plate-reverb simulation.
     * Used standalone (piano layer) and embedded in rain.
     */
    private buildLullaby(destination: AudioNode, masterVolume: number): void {
        const gain = this.ctx!.createGain();
        gain.gain.value = masterVolume;

        // Two-tap plate reverb
        const tap1 = this.ctx!.createDelay(1.0); tap1.delayTime.value = 0.22;
        const tap2 = this.ctx!.createDelay(1.0); tap2.delayTime.value = 0.41;
        const revLPF = this.ctx!.createBiquadFilter();
        revLPF.type = "lowpass"; revLPF.frequency.value = 1600;
        const revGain = this.ctx!.createGain(); revGain.gain.value = 0.28;
        const fb = this.ctx!.createGain(); fb.gain.value = 0.22;

        gain.connect(tap1); gain.connect(tap2);
        tap1.connect(revLPF); tap2.connect(revLPF);
        revLPF.connect(revGain); revGain.connect(destination);
        revGain.connect(fb); fb.connect(tap1);
        gain.connect(destination);

        const scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];

        const playNote = () => {
            if (!this.isPlaying) return;
            const t = this.ctx!.currentTime;
            const freq = scale[Math.floor(Math.random() * scale.length)];
            const decay = 3.0 + Math.random() * 3.0; // 3–6 s decay

            [
                { ratio: 1.0, amp: 0.55, detune:  0 },
                { ratio: 2.0, amp: 0.22, detune:  4 },
                { ratio: 3.0, amp: 0.07, detune: -3 },
            ].forEach(({ ratio, amp, detune }) => {
                const osc = this.ctx!.createOscillator();
                osc.type = "sine";
                osc.frequency.value = freq * ratio;
                osc.detune.value = detune;

                const env = this.ctx!.createGain();
                env.gain.setValueAtTime(0, t);
                env.gain.linearRampToValueAtTime(amp * 0.06, t + 0.015);
                env.gain.exponentialRampToValueAtTime(amp * 0.02, t + 0.4); // sustain
                env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                osc.connect(env); env.connect(gain);
                osc.start(t); osc.stop(t + decay + 0.1);
            });

            this.scheduleTimeout(playNote, 4000 + Math.random() * 5000);
        };

        this.scheduleTimeout(playNote, 1500 + Math.random() * 2000);
    }

    private async createPianoLayer(volume: number): Promise<void> {
        if (!this.ctx) return;
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        gain.connect(this.muffleFilter!);
        this.layers.set("piano", { gainNode: gain, sourceNodes: [] });

        const acousticSuccess = await this.playAcoustic("piano", null, "/sounds/piano.mp3", gain);
        if (acousticSuccess) return;
        if (!this.isPlaying) return;

        this.buildLullaby(gain, 1.0);
    }

    private async createShushLayer(volume: number): Promise<void> {
        if (!this.ctx) return;
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        gain.connect(this.muffleFilter!);
        this.layers.set("shush", { gainNode: gain, sourceNodes: [], filterChain: [] });

        const acousticSuccess = await this.playAcoustic("shush", null, "/sounds/shush.mp3", gain);
        if (acousticSuccess) return;
        if (!this.isPlaying) return;

        const bpf = this.ctx.createBiquadFilter();
        bpf.type = "bandpass"; bpf.frequency.value = 800; bpf.Q.value = 1.2;

        const sources = this.loopNoisePair(9, 10, 4, gain, [bpf]);

        const lfo = this.ctx.createOscillator();
        lfo.type = "sine"; lfo.frequency.value = 0.4;
        const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.18;
        lfo.connect(lfoG); lfoG.connect(gain.gain);
        lfo.start();

        const layer = this.layers.get("shush");
        if (layer) {
            layer.sourceNodes.push(...sources, lfo);
            layer.filterChain = [bpf];
        }
    }

    private createHeartbeatLayer(volume: number): void {
        if (!this.ctx) return;
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        gain.connect(this.muffleFilter!);

        const thump = () => {
            if (!this.isPlaying || !this.ctx) return;
            const amp = gain.gain.value; // live value respects setLayerVolume()
            const t = this.ctx.currentTime;

            [0, 0.19].forEach((offset) => {
                const osc = this.ctx!.createOscillator();
                osc.type = "sine"; osc.frequency.value = 55;

                const lpf = this.ctx!.createBiquadFilter();
                lpf.type = "lowpass"; lpf.frequency.value = 130; lpf.Q.value = 0.7;

                const env = this.ctx!.createGain();
                env.gain.setValueAtTime(0, t + offset);
                env.gain.linearRampToValueAtTime(Math.max(amp, 0.0001) * 0.45, t + offset + 0.07);
                env.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.4);

                osc.connect(lpf); lpf.connect(env); env.connect(gain);
                osc.start(t + offset); osc.stop(t + offset + 0.5);
            });
        };

        this.hbInterval = setInterval(thump, 60000 / 65);
        thump();

        this.layers.set("heartbeat", { gainNode: gain, sourceNodes: [] });
    }
}