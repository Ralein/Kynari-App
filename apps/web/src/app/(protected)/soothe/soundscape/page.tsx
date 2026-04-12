"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import {
    getSoundscapePreferences,
    saveSoundscapePreferences,
    logSoundscapeSession,
    type SoundscapeProfile,
} from "@/lib/api";
import {
    ChevronRight,
    Moon,
    Play,
    Pause,
    Waves,
    TreePine,
    CloudRain,
    Wind,
    Settings2,
    Clock,
    Loader2,
    Music,
    Volume2,
    Zap,
} from "lucide-react";
import { ProfileSelector } from "@/components/soundscape/ProfileSelector";
import { LayerMixer } from "@/components/soundscape/LayerMixer";
import { NatureSoundSelector } from "@/components/soundscape/NatureSoundSelector";
import { AutoAdaptBadge } from "@/components/soundscape/AutoAdaptBadge";

// ─── Profile presets ────────────────────────────────────────

const PROFILES: SoundscapeProfile[] = [
    { id: "deep_sleep", name: "Deep Sleep", description: "Ocean waves with strong pink noise", pink_noise: 0.7, nature: 0.4, piano: 0.2, shush: 0.0, icon: "🌙" },
    { id: "light_fuss", name: "Light Fuss", description: "Rain and piano, shush auto-activates", pink_noise: 0.5, nature: 0.3, piano: 0.3, shush: 0.0, icon: "🌧️" },
    { id: "heavy_fuss", name: "Heavy Fuss", description: "Maximum masking — strong noise", pink_noise: 0.85, nature: 0.0, piano: 0.0, shush: 0.0, icon: "💨" },
    { id: "nap_time", name: "Nap Time", description: "Forest ambience, light pink noise", pink_noise: 0.6, nature: 0.5, piano: 0.15, shush: 0.0, icon: "🌿" },
    { id: "white_room", name: "White Room", description: "Pure pink noise only", pink_noise: 1.0, nature: 0.0, piano: 0.0, shush: 0.0, icon: "⬜" },
];

const NATURE_SOUNDS = [
    { id: "ocean", name: "Ocean", icon: Waves },
    { id: "rain", name: "Rain", icon: CloudRain },
    { id: "forest", name: "Forest", icon: TreePine },
    { id: "none", name: "None", icon: Wind },
];

// Layer config
interface LayerState {
    pinkNoise: number;
    nature: number;
    piano: number;
    shush: number;
}

// Map nature sound ID → audio file
const NATURE_FILE_MAP: Record<string, string> = {
    ocean: "/sounds/ocean.ogg",
    rain: "/sounds/rain.ogg",
    forest: "/sounds/forest.ogg",
    none: "",
};

export default function SoundscapePage() {
    const { getToken } = useAuth();
    const { data: children } = useChildren();
    const [selectedChild, setSelectedChild] = useState("");
    const [activeProfile, setActiveProfile] = useState("deep_sleep");
    const [natureSound, setNatureSound] = useState("ocean");
    const [autoAdapt, setAutoAdapt] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [layers, setLayers] = useState<LayerState>({
        pinkNoise: 0.7,
        nature: 0.4,
        piano: 0.2,
        shush: 0.0,
    });
    const [saving, setSaving] = useState(false);

    const startTimeRef = useRef<Date | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Audio Refs ──────────────────────────────────────────
    const pinkNoiseRef = useRef<HTMLAudioElement | null>(null);
    const natureRef = useRef<HTMLAudioElement | null>(null);
    const pianoRef = useRef<HTMLAudioElement | null>(null);
    const shushRef = useRef<HTMLAudioElement | null>(null);

    // Create or get an audio element with loop enabled
    const getOrCreateAudio = useCallback((ref: React.MutableRefObject<HTMLAudioElement | null>, src: string) => {
        if (!ref.current && src) {
            ref.current = new Audio(src);
            ref.current.loop = true;
            ref.current.preload = "auto";
        }
        return ref.current;
    }, []);

    // Start all audio layers
    const startAudio = useCallback(() => {
        const pn = getOrCreateAudio(pinkNoiseRef, "/sounds/pink_noise.ogg");
        const ns = getOrCreateAudio(natureRef, NATURE_FILE_MAP[natureSound] || "");
        const pi = getOrCreateAudio(pianoRef, "/sounds/piano.ogg");
        const sh = getOrCreateAudio(shushRef, "/sounds/shush.ogg");

        if (pn) { pn.volume = layers.pinkNoise; pn.play().catch(() => {}); }
        if (ns && natureSound !== "none") { ns.volume = layers.nature; ns.play().catch(() => {}); }
        if (pi) { pi.volume = layers.piano; pi.play().catch(() => {}); }
        if (sh) { sh.volume = layers.shush; sh.play().catch(() => {}); }
    }, [getOrCreateAudio, layers, natureSound]);

    // Stop all audio layers
    const stopAudio = useCallback(() => {
        [pinkNoiseRef, natureRef, pianoRef, shushRef].forEach((ref) => {
            if (ref.current) {
                ref.current.pause();
                ref.current.currentTime = 0;
            }
        });
    }, []);

    // Destroy all audio elements (cleanup)
    const destroyAudio = useCallback(() => {
        [pinkNoiseRef, natureRef, pianoRef, shushRef].forEach((ref) => {
            if (ref.current) {
                ref.current.pause();
                ref.current.src = "";
                ref.current = null;
            }
        });
    }, []);

    // Sync layer volumes to audio elements in real-time
    useEffect(() => {
        if (!isPlaying) return;
        if (pinkNoiseRef.current) pinkNoiseRef.current.volume = layers.pinkNoise;
        if (natureRef.current) natureRef.current.volume = layers.nature;
        if (pianoRef.current) pianoRef.current.volume = layers.piano;
        if (shushRef.current) shushRef.current.volume = layers.shush;
    }, [layers, isPlaying]);

    // Handle nature sound switching while playing
    useEffect(() => {
        if (!isPlaying) return;
        // Stop old nature audio
        if (natureRef.current) {
            natureRef.current.pause();
            natureRef.current.src = "";
            natureRef.current = null;
        }
        // Start new one if not "none"
        const src = NATURE_FILE_MAP[natureSound];
        if (src) {
            const audio = new Audio(src);
            audio.loop = true;
            audio.volume = layers.nature;
            natureRef.current = audio;
            audio.play().catch(() => {});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [natureSound]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            destroyAudio();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [destroyAudio]);

    // Auto-select first child
    useEffect(() => {
        if (children?.length && !selectedChild) {
            setSelectedChild(children[0].id);
        }
    }, [children, selectedChild]);

    // Load preferences
    useEffect(() => {
        async function load() {
            if (!selectedChild) return;
            try {
                const token = await getToken();
                if (!token) return;
                const prefs = await getSoundscapePreferences(token, selectedChild);
                setActiveProfile(prefs.default_profile);
                setNatureSound(prefs.nature_sound);
                setAutoAdapt(prefs.auto_adapt);
                const profile = PROFILES.find((p) => p.id === prefs.default_profile);
                if (profile) {
                    setLayers({
                        pinkNoise: profile.pink_noise,
                        nature: profile.nature,
                        piano: profile.piano,
                        shush: profile.shush,
                    });
                }
            } catch {
                // Use defaults
            }
        }
        load();
    }, [selectedChild, getToken]);

    const selectProfile = (profileId: string) => {
        const profile = PROFILES.find((p) => p.id === profileId);
        if (!profile) return;
        setActiveProfile(profileId);
        setLayers({
            pinkNoise: profile.pink_noise,
            nature: profile.nature,
            piano: profile.piano,
            shush: profile.shush,
        });
    };

    const togglePlay = useCallback(() => {
        if (isPlaying) {
            // Stop audio
            stopAudio();
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);

            // Log session
            if (startTimeRef.current && selectedChild && elapsed > 0) {
                (async () => {
                    try {
                        const token = await getToken();
                        if (!token) return;
                        await logSoundscapeSession(token, {
                            child_id: selectedChild,
                            started_at: startTimeRef.current!.toISOString(),
                            duration_minutes: Math.round(elapsed / 60),
                            avg_distress: 0.3,
                            profile_used: activeProfile,
                            auto_adapt_used: autoAdapt,
                        });
                    } catch { /* silently fail */ }
                })();
            }
            setElapsed(0);
            startTimeRef.current = null;
        } else {
            // Start audio
            startAudio();
            setIsPlaying(true);
            startTimeRef.current = new Date();
            timerRef.current = setInterval(() => {
                setElapsed((e) => e + 1);
            }, 1000);
        }
    }, [isPlaying, selectedChild, elapsed, activeProfile, autoAdapt, getToken, startAudio, stopAudio]);

    const savePrefs = async () => {
        if (!selectedChild) return;
        setSaving(true);
        try {
            const token = await getToken();
            if (!token) return;
            await saveSoundscapePreferences(token, {
                child_id: selectedChild,
                default_profile: activeProfile,
                auto_adapt: autoAdapt,
                nature_sound: natureSound,
            });
        } catch { /* silently fail */ }
        finally { setSaving(false); }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    const handleLayerChange = (key: keyof LayerState, value: number) => {
        setLayers((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="animate-fade-in space-y-6 relative z-10 w-full mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/soothe" className="hover:text-[#6B48C8] transition-colors">Soothe</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Sleep Soundscape</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                    Sleep Soundscape
                </h1>
                <p className="text-sm text-[#4a4b5e] mt-1">
                    Layered sounds that adapt to your baby&apos;s needs.
                </p>
            </div>

            {/* Active Session Card */}
            <div className="bg-gradient-to-br from-[#EAE2FB]/60 to-[#1a1b2e]/5 border border-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
                            <Moon className="w-6 h-6 text-[#6B48C8]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#1a1b2e]">Session Activity</p>
                            <p className="text-xs text-[#4a4b5e]">{isPlaying ? "Mixing sounds live..." : "Paused"}</p>
                        </div>
                    </div>
                    <AutoAdaptBadge active={autoAdapt} />
                </div>

                {/* Play/Stop + Timer */}
                <div className="flex items-center justify-center gap-6">
                    <button
                        onClick={togglePlay}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                            isPlaying
                                ? "bg-[#F0897A] hover:bg-[#E87A6A] scale-105"
                                : "bg-gradient-to-r from-[#6B48C8] to-[#8B6CDB] hover:shadow-xl hover:scale-105"
                        }`}
                    >
                        {isPlaying ? (
                            <Pause className="w-8 h-8 text-white" />
                        ) : (
                            <Play className="w-8 h-8 text-white ml-1" />
                        )}
                    </button>
                    {isPlaying && (
                        <div className="flex items-center gap-2 text-[#1a1b2e] animate-fade-in">
                            <Clock className="w-4 h-4 text-[#6B48C8]" />
                            <span className="text-2xl font-mono font-bold tracking-wider">
                                {formatTime(elapsed)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Selector */}
            <ProfileSelector 
                profiles={PROFILES} 
                activeProfile={activeProfile} 
                onSelectProfile={selectProfile} 
            />

            {/* Layer Mixer */}
            <LayerMixer 
                layers={layers} 
                natureSound={natureSound} 
                onLayerChange={handleLayerChange} 
            />

            {/* Nature Sound Selector */}
            <NatureSoundSelector 
                sounds={NATURE_SOUNDS} 
                selectedId={natureSound} 
                onSelect={setNatureSound} 
            />

            {/* Settings Row */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Settings2 className="w-5 h-5 text-[#6B48C8]" />
                        <div>
                            <p className="text-sm font-bold text-[#1a1b2e]">Auto-Adapt</p>
                            <p className="text-xs text-[#4a4b5e]">
                                Adjusts layers based on distress level
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setAutoAdapt(!autoAdapt)}
                        className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
                            autoAdapt ? "bg-[#6B48C8]" : "bg-slate-300"
                        }`}
                    >
                        <div
                            className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all duration-300 ${
                                autoAdapt ? "left-6" : "left-1"
                            }`}
                        />
                    </button>
                </div>

                {/* Child Selector */}
                {children && children.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="text-xs font-semibold text-slate-500 block mb-2">
                            Playing for
                        </label>
                        <select
                            value={selectedChild}
                            onChange={(e) => setSelectedChild(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-[#1a1b2e]"
                        >
                            {children.map((child) => (
                                <option key={child.id} value={child.id}>
                                    {child.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Save Button */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={savePrefs}
                        disabled={saving || !selectedChild}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}
