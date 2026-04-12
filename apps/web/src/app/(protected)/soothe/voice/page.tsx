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
    Loader2,
} from "lucide-react";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { NowPlayingBar } from "@/components/voice/NowPlayingBar";
import { MoodFilter } from "@/components/voice/MoodFilter";
import { LullabyLibrary } from "@/components/voice/LullabyLibrary";

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
            <NowPlayingBar 
                generating={generating}
                playingId={playingId}
                currentLullaby={currentLullaby}
                isPlaying={isPlaying}
                progress={progress}
                selectedVoice={selectedVoice}
                voices={voices}
                onTogglePause={togglePause}
                onStop={stopPlayback}
            />

            {/* Voice Selector */}
            <VoiceSelector 
                voices={voices} 
                selectedVoiceId={selectedVoice} 
                onSelectVoice={selectVoice} 
            />

            {/* Mood Filter */}
            <MoodFilter 
                chips={MOOD_CHIPS} 
                activeMood={activeMood} 
                onSelectMood={setActiveMood} 
            />

            <LullabyLibrary 
                lullabies={filteredLullabies} 
                playingId={playingId} 
                isPlaying={isPlaying} 
                generating={generating} 
                onPlay={playLullaby} 
                onTogglePause={togglePause} 
            />

        </div>
    );
}
