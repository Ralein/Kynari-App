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
    Volume2,
    Waves,
    TreePine,
    CloudRain,
    Music,
    Wind,
    Zap,
    Settings2,
    Clock,
    Loader2,
} from "lucide-react";

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
            // Stop
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
            // Start
            setIsPlaying(true);
            startTimeRef.current = new Date();
            timerRef.current = setInterval(() => {
                setElapsed((e) => e + 1);
            }, 1000);
        }
    }, [isPlaying, selectedChild, elapsed, activeProfile, autoAdapt, getToken]);

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

    const LAYER_CONFIG = [
        { key: "pinkNoise" as const, label: "Pink Noise", icon: Volume2, color: "#F0897A" },
        { key: "nature" as const, label: natureSound === "none" ? "Nature (off)" : `Nature (${natureSound})`, icon: NATURE_SOUNDS.find(n => n.id === natureSound)?.icon || Waves, color: "#93E2FA" },
        { key: "piano" as const, label: "Soft Piano", icon: Music, color: "#6B48C8" },
        { key: "shush" as const, label: "Shush Rhythm", icon: Wind, color: "#B5EAC5" },
    ];

    return (
        <div className="animate-fade-in relative z-10 w-full mx-auto max-w-3xl space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Link href="/soothe" className="hover:text-[#1a1b2e] transition-colors">
                    Soothe
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Sleep Soundscape</span>
            </div>

            {/* Header + Play Button */}
            <div className="bg-gradient-to-br from-[#EAE2FB]/60 to-[#1a1b2e]/5 border border-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <Moon className="w-6 h-6 text-[#6B48C8]" />
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                                Sleep Soundscape
                            </h1>
                        </div>
                        <p className="text-sm text-[#4a4b5e]">
                            Layered sounds that adapt to your baby&apos;s needs.
                        </p>
                    </div>
                    {autoAdapt && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#D5F5E3] text-[#4CAF50]">
                            <Zap className="w-3 h-3" />
                            Auto-Adapt
                        </div>
                    )}
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
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
                <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-4">
                    Sound Profile
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {PROFILES.map((profile) => (
                        <button
                            key={profile.id}
                            onClick={() => selectProfile(profile.id)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ${
                                activeProfile === profile.id
                                    ? "bg-[#EAE2FB] border-[#6B48C8]/30 shadow-sm"
                                    : "bg-white/50 border-white/80 hover:bg-white/80"
                            }`}
                        >
                            <span className="text-2xl">{profile.icon}</span>
                            <span className={`text-xs font-semibold ${
                                activeProfile === profile.id ? "text-[#6B48C8]" : "text-[#4a4b5e]"
                            }`}>
                                {profile.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Layer Mixer */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
                <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-5">
                    Layer Mixer
                </h2>
                <div className="space-y-5">
                    {LAYER_CONFIG.map((layer) => {
                        const Icon = layer.icon;
                        const value = layers[layer.key];
                        const pct = Math.round(value * 100);
                        return (
                            <div key={layer.key} className="flex items-center gap-4">
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${layer.color}20` }}
                                >
                                    <Icon className="w-4.5 h-4.5" style={{ color: layer.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-semibold text-[#1a1b2e]">
                                            {layer.label}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500">
                                            {pct}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={pct}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value) / 100;
                                            setLayers((prev) => ({ ...prev, [layer.key]: v }));
                                        }}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, ${layer.color} 0%, ${layer.color} ${pct}%, #E5E7EB ${pct}%, #E5E7EB 100%)`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Nature Sound Selector */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
                <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-4">
                    Nature Sound
                </h2>
                <div className="grid grid-cols-4 gap-2.5">
                    {NATURE_SOUNDS.map((sound) => {
                        const Icon = sound.icon;
                        return (
                            <button
                                key={sound.id}
                                onClick={() => setNatureSound(sound.id)}
                                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 ${
                                    natureSound === sound.id
                                        ? "bg-[#D6F4FF] border-[#93E2FA]/50 shadow-sm"
                                        : "bg-white/50 border-white/80 hover:bg-white/80"
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${
                                    natureSound === sound.id ? "text-[#3AADDB]" : "text-slate-400"
                                }`} />
                                <span className={`text-xs font-semibold ${
                                    natureSound === sound.id ? "text-[#3AADDB]" : "text-slate-500"
                                }`}>
                                    {sound.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

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
