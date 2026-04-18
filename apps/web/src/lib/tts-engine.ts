/**
 * Client-Side TTS Engine — Web Speech API
 *
 * Provides text-to-speech using the browser's built-in SpeechSynthesis API.
 * Maps Kokoro voice IDs to browser-available voices with configurable
 * rate, pitch, and voice selection.
 *
 * Used by Voice Lullaby and Story Book read-aloud features.
 */

export interface TTSVoiceOption {
    id: string;
    name: string;
    gender: "Female" | "Male";
    style: string;
    description: string;
    lang: string;
}

// Voice catalogue — maps to browser voices by gender/lang preference
export const TTS_VOICES: TTSVoiceOption[] = [
    { id: "af_sarah", name: "Sarah", gender: "Female", style: "Warm & gentle", description: "A calm, nurturing voice perfect for bedtime.", lang: "en-US" },
    { id: "af_bella", name: "Bella", gender: "Female", style: "Soft & melodic", description: "Sweet and musical, great for lullabies.", lang: "en-US" },
    { id: "af_nicole", name: "Nicole", gender: "Female", style: "Clear & soothing", description: "Clear diction with a warm undertone.", lang: "en-US" },
    { id: "af_sky", name: "Sky", gender: "Female", style: "Airy & dreamy", description: "Light and ethereal, like a whisper.", lang: "en-US" },
    { id: "af_heart", name: "Heart", gender: "Female", style: "Loving & warm", description: "Full of warmth, like a loving embrace.", lang: "en-US" },
    { id: "am_adam", name: "Adam", gender: "Male", style: "Deep & calm", description: "A deep, reassuring voice for bedtime stories.", lang: "en-US" },
    { id: "am_michael", name: "Michael", gender: "Male", style: "Gentle & steady", description: "Steady and reliable, like a gentle guide.", lang: "en-US" },
    { id: "bf_emma", name: "Emma", gender: "Female", style: "British & warm", description: "A warm British accent, perfect for stories.", lang: "en-GB" },
    { id: "bf_isabella", name: "Isabella", gender: "Female", style: "British & elegant", description: "Refined and elegant, soothing to listen to.", lang: "en-GB" },
    { id: "bm_george", name: "George", gender: "Male", style: "British & gentle", description: "A classic British voice, calm and composed.", lang: "en-GB" },
    { id: "bm_lewis", name: "Lewis", gender: "Male", style: "British & deep", description: "Rich and deep, like a warm blanket.", lang: "en-GB" },
];

export type TTSEventType = "start" | "end" | "pause" | "resume" | "error" | "boundary";
export type TTSEventCallback = (event: TTSEventType, data?: unknown) => void;

export class TTSEngine {
    private utterance: SpeechSynthesisUtterance | null = null;
    private availableVoices: SpeechSynthesisVoice[] = [];
    private voiceCache: Map<string, SpeechSynthesisVoice | null> = new Map();
    private listeners: TTSEventCallback[] = [];
    private _isSpeaking = false;

    constructor() {
        this.loadVoices();
        // Voices may load asynchronously
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    private loadVoices(): void {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        this.availableVoices = window.speechSynthesis.getVoices();
        this.voiceCache.clear();
    }

    /** Find the best matching browser voice for a voice ID */
    private getBrowserVoice(voiceId: string): SpeechSynthesisVoice | null {
        if (this.voiceCache.has(voiceId)) {
            return this.voiceCache.get(voiceId) || null;
        }

        const voiceConfig = TTS_VOICES.find((v) => v.id === voiceId);
        if (!voiceConfig || !this.availableVoices.length) {
            return this.availableVoices[0] || null;
        }

        // Match by language first, then gender preference
        const langVoices = this.availableVoices.filter(
            (v) => v.lang.startsWith(voiceConfig.lang.split("-")[0])
        );

        // Prioritize voices that match the lang exactly
        const exactLang = langVoices.filter((v) => v.lang === voiceConfig.lang);
        const candidates = exactLang.length > 0 ? exactLang : langVoices;

        if (candidates.length === 0) {
            const fallback = this.availableVoices[0] || null;
            this.voiceCache.set(voiceId, fallback);
            return fallback;
        }

        // Try to pick different voices for different IDs to create variety
        const voiceIndex = TTS_VOICES.findIndex((v) => v.id === voiceId);
        const selected = candidates[voiceIndex % candidates.length] || candidates[0];

        this.voiceCache.set(voiceId, selected);
        return selected;
    }

    /** Speak text with a given voice */
    speak(
        text: string,
        voiceId: string = "af_sarah",
        options: { rate?: number; pitch?: number } = {}
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof window === "undefined" || !window.speechSynthesis) {
                reject(new Error("Speech synthesis not supported"));
                return;
            }

            // Cancel any ongoing speech
            this.stop();

            const utterance = new SpeechSynthesisUtterance(text);
            this.utterance = utterance;

            // Set voice
            const voice = this.getBrowserVoice(voiceId);
            if (voice) {
                utterance.voice = voice;
            }

            // Lullaby-appropriate settings — slower, softer
            utterance.rate = options.rate ?? 0.85;
            utterance.pitch = options.pitch ?? 0.95;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                this._isSpeaking = true;
                this.emit("start");
            };

            utterance.onend = () => {
                this._isSpeaking = false;
                this.utterance = null;
                this.emit("end");
                resolve();
            };

            utterance.onerror = (e) => {
                this._isSpeaking = false;
                this.utterance = null;
                this.emit("error", e);
                // Don't reject on 'interrupted' or 'canceled' errors
                if (e.error === "interrupted" || e.error === "canceled") {
                    resolve();
                } else {
                    reject(new Error(`TTS error: ${e.error}`));
                }
            };

            utterance.onpause = () => this.emit("pause");
            utterance.onresume = () => this.emit("resume");
            utterance.onboundary = (e) => this.emit("boundary", e);

            window.speechSynthesis.speak(utterance);
        });
    }

    /** Pause current speech */
    pause(): void {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.pause();
        }
    }

    /** Resume paused speech */
    resume(): void {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.resume();
        }
    }

    /** Stop and cancel all speech */
    stop(): void {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this._isSpeaking = false;
        this.utterance = null;
    }

    /** Check if currently speaking */
    get isSpeaking(): boolean {
        return this._isSpeaking;
    }

    /** Add event listener */
    on(callback: TTSEventCallback): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
        };
    }

    /** List available voices */
    getVoices(): TTSVoiceOption[] {
        return TTS_VOICES;
    }

    private emit(event: TTSEventType, data?: unknown): void {
        this.listeners.forEach((cb) => cb(event, data));
    }
}

// Singleton instance
let _engine: TTSEngine | null = null;
export function getTTSEngine(): TTSEngine {
    if (!_engine) {
        _engine = new TTSEngine();
    }
    return _engine;
}
