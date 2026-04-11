"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
    getVoices,
    getLullabies,
    getVoicePreference,
    saveVoicePreference,
    generateLullabyBlob,
    type VoiceInfo,
    type LullabyInfo,
} from "@/lib/api";
import {
    ChevronRight,
    Music,
    Play,
    Pause,
    Square,
    Mic2,
    Loader2,
    User,
    Check,
    SkipForward,
    Volume2,
} from "lucide-react";

const MOOD_CHIPS = [
    { id: "all", label: "All", color: "#F0897A" },
    { id: "sleepy", label: "Sleepy", color: "#6B48C8" },
    { id: "calm", label: "Calm", color: "#93E2FA" },
    { id: "comfort", label: "Comfort", color: "#F3A595" },
    { id: "playful", label: "Playful", color: "#B5EAC5" },
];

export default function VoiceLullabyPage() {
    const { getToken } = useAuth();

    // Data state
    const [voices, setVoices] = useState<VoiceInfo[]>([]);
    const [lullabies, setLullabies] = useState<LullabyInfo[]>([]);
    const [selectedVoice, setSelectedVoice] = useState("af_sarah");
    const [activeMood, setActiveMood] = useState("all");

    // Playback state
    const [generating, setGenerating] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentLullaby, setCurrentLullaby] = useState<LullabyInfo | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load voices and lullabies
    useEffect(() => {
        async function load() {
            try {
                const token = await getToken();
                if (!token) return;
                const [voiceList, lullabyList, pref] = await Promise.all([
                    getVoices(token),
                    getLullabies(token),
                    getVoicePreference(token).catch(() => null),
                ]);
                setVoices(voiceList);
                setLullabies(lullabyList);
                if (pref?.selected_voice) {
                    setSelectedVoice(pref.selected_voice);
                }
            } catch {
                // Silent fail
            }
        }
        load();
    }, [getToken]);

    const selectVoice = useCallback(async (voiceId: string) => {
        setSelectedVoice(voiceId);
        try {
            const token = await getToken();
            if (token) {
                await saveVoicePreference(token, voiceId);
            }
        } catch { /* silent fail */ }
    }, [getToken]);

    const playLullaby = useCallback(async (lullaby: LullabyInfo) => {
        // Stop any current playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (progressRef.current) {
            clearInterval(progressRef.current);
        }

        setPlayingId(lullaby.id);
        setCurrentLullaby(lullaby);
        setGenerating(true);
        setProgress(0);
        setIsPlaying(false);

        try {
            const token = await getToken();
            if (!token) return;

            const blob = await generateLullabyBlob(token, selectedVoice, lullaby.id);
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onplay = () => {
                setIsPlaying(true);
                setGenerating(false);
            };
            audio.onended = () => {
                setIsPlaying(false);
                setPlayingId(null);
                setProgress(0);
                setCurrentLullaby(null);
                URL.revokeObjectURL(url);
            };
            audio.onerror = () => {
                setGenerating(false);
                setIsPlaying(false);
                setPlayingId(null);
            };

            // Track progress
            progressRef.current = setInterval(() => {
                if (audio.duration > 0) {
                    setProgress((audio.currentTime / audio.duration) * 100);
                }
            }, 200);

            await audio.play();
        } catch {
            setGenerating(false);
            setPlayingId(null);
        }
    }, [getToken, selectedVoice]);

    const togglePause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const stopPlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (progressRef.current) clearInterval(progressRef.current);
        setIsPlaying(false);
        setPlayingId(null);
        setCurrentLullaby(null);
        setProgress(0);
    };

    const filteredLullabies = activeMood === "all"
        ? lullabies
        : lullabies.filter((l) => l.mood === activeMood);

    return (
        <div className="animate-fade-in relative z-10 w-full mx-auto max-w-3xl space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Link href="/soothe" className="hover:text-[#1a1b2e] transition-colors">
                    Soothe
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Voice Lullaby</span>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-br from-[#D6F4FF]/60 to-[#C2ECFB]/30 border border-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-2.5 mb-2">
                    <Music className="w-6 h-6 text-[#3AADDB]" />
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Voice Lullaby Studio
                    </h1>
                </div>
                <p className="text-sm text-[#4a4b5e]">
                    Choose a voice and play classic lullabies rendered with Kokoro AI.
                </p>
            </div>

            {/* Now Playing Bar */}
            {(playingId || generating) && currentLullaby && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5 animate-fade-in">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D6F4FF] to-[#C2ECFB] flex items-center justify-center shrink-0">
                            {generating ? (
                                <Loader2 className="w-6 h-6 text-[#3AADDB] animate-spin" />
                            ) : (
                                <Volume2 className="w-6 h-6 text-[#3AADDB]" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#1a1b2e] truncate">
                                {currentLullaby.title}
                            </p>
                            <p className="text-xs text-slate-500">
                                {generating ? "Generating audio..." : `Voice: ${voices.find(v => v.voice_id === selectedVoice)?.name || selectedVoice}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={togglePause}
                                disabled={generating}
                                className="w-10 h-10 rounded-full bg-[#3AADDB] text-white flex items-center justify-center hover:bg-[#2E9AC2] transition-colors disabled:opacity-50"
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                            </button>
                            <button
                                onClick={stopPlayback}
                                className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                                <Square className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#93E2FA] to-[#3AADDB] rounded-full transition-all duration-200"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Voice Selector */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Mic2 className="w-4 h-4 text-[#6B48C8]" />
                    <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Select Voice
                    </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {voices.map((voice) => (
                        <button
                            key={voice.voice_id}
                            onClick={() => selectVoice(voice.voice_id)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 ${
                                selectedVoice === voice.voice_id
                                    ? "bg-[#EAE2FB] border-[#6B48C8]/30 shadow-sm"
                                    : "bg-white/50 border-white/80 hover:bg-white/80"
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                selectedVoice === voice.voice_id ? "bg-[#6B48C8] text-white" : "bg-slate-100 text-slate-400"
                            }`}>
                                {selectedVoice === voice.voice_id ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <User className="w-4 h-4" />
                                )}
                            </div>
                            <div className="text-left min-w-0">
                                <p className={`text-xs font-bold truncate ${
                                    selectedVoice === voice.voice_id ? "text-[#6B48C8]" : "text-[#1a1b2e]"
                                }`}>
                                    {voice.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">{voice.style}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mood Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {MOOD_CHIPS.map((chip) => (
                    <button
                        key={chip.id}
                        onClick={() => setActiveMood(chip.id)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                            activeMood === chip.id
                                ? "text-white shadow-sm"
                                : "bg-white/70 text-slate-500 border border-white/80 hover:bg-white/90"
                        }`}
                        style={activeMood === chip.id ? { backgroundColor: chip.color } : undefined}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* Lullaby Library */}
            <div className="space-y-3">
                {filteredLullabies.map((lullaby) => {
                    const isActive = playingId === lullaby.id;
                    return (
                        <div
                            key={lullaby.id}
                            className={`bg-white/70 backdrop-blur-sm border shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5 transition-all duration-300 ${
                                isActive
                                    ? "border-[#93E2FA]/50 bg-[#D6F4FF]/20"
                                    : "border-white/80 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)]"
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Play button */}
                                <button
                                    onClick={() => isActive ? (isPlaying ? togglePause() : togglePause()) : playLullaby(lullaby)}
                                    disabled={generating && !isActive}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                                        isActive
                                            ? "bg-[#3AADDB] text-white shadow-md"
                                            : "bg-slate-100 text-slate-400 hover:bg-[#D6F4FF] hover:text-[#3AADDB]"
                                    } disabled:opacity-50`}
                                >
                                    {isActive && generating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isActive && isPlaying ? (
                                        <Pause className="w-5 h-5" />
                                    ) : (
                                        <Play className="w-5 h-5 ml-0.5" />
                                    )}
                                </button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-[#1a1b2e] truncate">
                                        {lullaby.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {lullaby.origin} · ~{lullaby.duration_estimate}s
                                    </p>
                                </div>

                                {/* Mood badge */}
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                                    lullaby.mood === "sleepy" ? "bg-[#EAE2FB] text-[#6B48C8]"
                                    : lullaby.mood === "calm" ? "bg-[#D6F4FF] text-[#3AADDB]"
                                    : lullaby.mood === "comfort" ? "bg-[#FFE5E0] text-[#F0897A]"
                                    : "bg-[#D5F5E3] text-[#4CAF50]"
                                }`}>
                                    {lullaby.mood}
                                </span>
                            </div>

                            {/* Lyrics preview (when active) */}
                            {isActive && (
                                <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
                                    <p className="text-xs text-[#4a4b5e] leading-relaxed whitespace-pre-line">
                                        {lullaby.lyrics}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
