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
    Clock,
    Music,
    Volume2,
    Zap,
    CloudRain,
    Wind,
    Waves,
    TreePine,
    Sparkles,
    Wind as WindIcon,
    Moon as MoonIcon,
    CloudDrizzle,
    ChevronRight,
    Moon,
    Play,
    Pause,
    Settings2,
    Loader2,
    Fish,
    Activity,
} from "lucide-react";
import { ProfileSelector } from "@/components/soundscape/ProfileSelector";
import { LayerMixer } from "@/components/soundscape/LayerMixer";
import { NatureSoundSelector } from "@/components/soundscape/NatureSoundSelector";
import { AutoAdaptBadge } from "@/components/soundscape/AutoAdaptBadge";
import { SoundscapeEngine, type NatureSoundType, type LayerVolumes } from "@/lib/audio-engine";

// ─── Profile presets ────────────────────────────────────────

const PROFILES: (SoundscapeProfile & { LucideIcon: any; muffled?: boolean })[] = [
    { id: "deep_sleep", name: "Deep Dream", description: "Spatialized sine-clusters and deep bass", pink_noise: 0.7, nature: 0.4, piano: 0.2, shush: 0.0, heartbeat: 0.0, icon: "🌙", LucideIcon: MoonIcon },
    { id: "light_fuss", name: "Silk Breeze", description: "Hiss-free rain textures and soft piano", pink_noise: 0.5, nature: 0.3, piano: 0.3, shush: 0.0, heartbeat: 0.0, icon: "🌧️", LucideIcon: CloudDrizzle },
    { id: "heavy_fuss", name: "Harmonic Shield", description: "Maximum sonic masking — zero-hiss", pink_noise: 0.85, nature: 0.0, piano: 0.0, shush: 0.0, heartbeat: 0.0, icon: "🌬️", LucideIcon: WindIcon },
    { id: "womb", name: "Organic Womb", description: "Distant heartbeat in a liquid space", pink_noise: 0.6, nature: 0.0, piano: 0.0, shush: 0.0, heartbeat: 0.8, icon: "🤰", LucideIcon: Activity, muffled: true },
    { id: "underwater", name: "Deep Water", description: "Resonant abyss and whale calls", pink_noise: 0.2, nature: 0.7, piano: 0.1, shush: 0.0, heartbeat: 0.0, icon: "🐋", LucideIcon: Fish, muffled: true },
];



const NATURE_SOUNDS = [
    { id: "ocean", name: "Ocean", icon: Waves },
    { id: "rain", name: "Rain", icon: CloudRain },
    { id: "forest", name: "Forest", icon: TreePine },
    { id: "whale", name: "Whale", icon: Fish },
    { id: "none", name: "None", icon: Wind },
];

const TIMER_OPTIONS = [
    { label: "Infinite", value: 0 },
    { label: "15m", value: 15 },
    { label: "30m", value: 30 },
    { label: "1h", value: 60 },
    { label: "2h", value: 120 },
];

// Layer config
interface LayerState {
    pinkNoise: number;
    nature: number;
    piano: number;
    shush: number;
    heartbeat: number;
}

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
        heartbeat: 0.0,
    });
    const [saving, setSaving] = useState(false);
    const [timerSettings, setTimerSettings] = useState<number>(0);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const startTimeRef = useRef<Date | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Web Audio Engine ────────────────────────────────────
    const engineRef = useRef<SoundscapeEngine | null>(null);

    // Lazy-init the engine
    const getEngine = useCallback(() => {
        if (!engineRef.current) {
            engineRef.current = new SoundscapeEngine();
        }
        return engineRef.current;
    }, []);

    // Sync layer volumes to audio engine in real-time
    useEffect(() => {
        if (!isPlaying) return;
        const engine = engineRef.current;
        if (engine) {
            engine.setVolumes(layers);
        }
    }, [layers, isPlaying]);

    // Sync muffling state to audio engine
    useEffect(() => {
        if (!isPlaying) return;
        const profile = PROFILES.find((p) => p.id === activeProfile);
        const engine = engineRef.current;
        if (engine) {
            engine.setMuffled(!!profile?.muffled);
        }
    }, [activeProfile, isPlaying]);

    // Handle nature sound switching while playing
    useEffect(() => {
        if (!isPlaying) return;
        const engine = engineRef.current;
        if (engine) {
            engine.switchNature(natureSound as NatureSoundType);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [natureSound]);


    // Cleanup on unmount
    useEffect(() => {
        return () => {
            const engine = engineRef.current;
            if (engine && engine.playing) {
                engine.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Timer fade-out logic
    useEffect(() => {
        if (isPlaying && timerSettings > 0 && !isFadingOut) {
            const remaining = timerSettings * 60 - elapsed;
            if (remaining === 10) {
                setIsFadingOut(true);
                const engine = engineRef.current;
                if (engine) engine.fadeOutAndStop(10);
            }
            if (remaining <= 0) {
                setIsPlaying(false);
                setIsFadingOut(false);
                if (timerRef.current) clearInterval(timerRef.current);
            }
        }
    }, [elapsed, isPlaying, timerSettings, isFadingOut]);

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
                        heartbeat: profile.heartbeat,
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
            heartbeat: profile.heartbeat,
        });
    };

    const togglePlay = useCallback(() => {
        if (isPlaying) {
            // Stop engine
            const engine = engineRef.current;
            if (engine) engine.stop();
            setIsPlaying(false);
            setIsFadingOut(false);
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
            // Start engine
            setIsFadingOut(false);
            const engine = getEngine();
            const profile = PROFILES.find((p) => p.id === activeProfile);
            engine.start(layers, natureSound as NatureSoundType, !!profile?.muffled);
            setIsPlaying(true);
            startTimeRef.current = new Date();
            timerRef.current = setInterval(() => {
                setElapsed((e) => e + 1);
            }, 1000);
        }

    }, [isPlaying, selectedChild, elapsed, activeProfile, autoAdapt, getToken, getEngine, layers, natureSound]);

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
                <Link href="/playbook" className="hover:text-[#6B48C8] transition-colors">Playbook</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Sleep Soundscape</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                    Sleep Soundscape
                </h1>
                <p className="text-sm text-[#4a4b5e] mt-1">
                    Binaural harmonic textures that adapt to your baby&apos;s needs.
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
                <div className="flex flex-col items-center gap-5">
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
                                <span className={`text-2xl font-mono font-bold tracking-wider ${isFadingOut ? 'opacity-50 animate-pulse text-[#E87A6A]' : ''}`}>
                                    {timerSettings > 0 ? formatTime(Math.max(0, timerSettings * 60 - Math.min(elapsed, timerSettings * 60))) : formatTime(elapsed)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Timer Control Options */}
                    {!isPlaying && (
                        <div className="flex items-center justify-center gap-2 w-full animate-fade-in">
                            <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
                            {TIMER_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTimerSettings(opt.value)}
                                    className={`px-3 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 ${
                                        timerSettings === opt.value
                                            ? "bg-[#6B48C8] text-white shadow-sm"
                                            : "bg-white/60 text-[#4a4b5e] hover:bg-white"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Audio Visualization */}
                {isPlaying && (
                    <div className="mt-6 flex items-center justify-center gap-1 animate-fade-in">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="w-1 bg-[#6B48C8]/40 rounded-full animate-pulse"
                                style={{
                                    height: `${8 + Math.random() * 20}px`,
                                    animationDelay: `${i * 0.1}s`,
                                    animationDuration: `${0.8 + Math.random() * 0.6}s`,
                                }}
                            />
                        ))}
                    </div>
                )}
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
