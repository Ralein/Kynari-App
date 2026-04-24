"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
    ChevronRight,
    Music,
    Loader2,
    Moon,
} from "lucide-react";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { NowPlayingBar } from "@/components/voice/NowPlayingBar";
import { MoodFilter } from "@/components/voice/MoodFilter";
import { LullabyLibrary } from "@/components/voice/LullabyLibrary";
import { getVoices, getLullabies, generateLullabyBlob, type VoiceInfo, type LullabyInfo } from "@/lib/api";

const MOOD_CHIPS = [
    { id: "all", label: "All", color: "#F0897A" },
    { id: "sleepy", label: "Sleepy", color: "#6B48C8" },
    { id: "calm", label: "Calm", color: "#93E2FA" },
    { id: "comfort", label: "Comfort", color: "#F3A595" },
    { id: "playful", label: "Playful", color: "#B5EAC5" },
];

export default function VoiceLullabyPage() {
    const { getToken } = useAuth();
    
    const [voices, setVoices] = useState<VoiceInfo[]>([]);
    const [lullabies, setLullabies] = useState<LullabyInfo[]>([]);
    const [selectedVoice, setSelectedVoice] = useState("af_sarah");
    const [isSoothingMode, setIsSoothingMode] = useState(false);
    const [activeMood, setActiveMood] = useState("all");
    const [loading, setLoading] = useState(true);

    // Playback state
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentLullaby, setCurrentLullaby] = useState<LullabyInfo | null>(null);
    const [generating, setGenerating] = useState(false);

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load voices and lullabies from API
    useEffect(() => {
        async function load() {
            try {
                const token = await getToken();
                if (!token) return;

                const [voicesData, lullabiesData] = await Promise.all([
                    getVoices(token),
                    getLullabies(token),
                ]);

                setVoices(voicesData);
                setLullabies(lullabiesData);
            } catch (err) {
                console.error("Failed to load voice/lullaby data:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [getToken]);

    // Progress tracking
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            const pct = (audio.currentTime / audio.duration) * 100;
            setProgress(isNaN(pct) ? 0 : pct);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setPlayingId(null);
            setProgress(0);
            setCurrentLullaby(null);
        };

        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateProgress);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [isPlaying]);

    const selectVoice = useCallback((voiceId: string) => {
        setSelectedVoice(voiceId);
    }, []);

    const playLullaby = useCallback(async (lullaby: LullabyInfo) => {
        // Stop current audio if any
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        setPlayingId(lullaby.id);
        setCurrentLullaby(lullaby);
        setGenerating(true);
        setProgress(0);
        setIsPlaying(false);

        try {
            const token = await getToken();
            if (!token) throw new Error("No token");

            const activeVoice = isSoothingMode ? "af_heart" : selectedVoice;
            const blob = await generateLullabyBlob(token, activeVoice, lullaby.id);
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            audioRef.current = audio;
            
            audio.play();
            setIsPlaying(true);
        } catch (err) {
            console.error("Lullaby generation failed:", err);
            setPlayingId(null);
            setCurrentLullaby(null);
        } finally {
            setGenerating(false);
        }
    }, [selectedVoice, getToken]);

    const togglePause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play();
            setIsPlaying(true);
        }
    };

    const stopPlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlaying(false);
        setPlayingId(null);
        setCurrentLullaby(null);
        setProgress(0);
    };

    const filteredLullabies = activeMood === "all"
        ? lullabies
        : lullabies.filter((l) => l.mood === activeMood);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <Loader2 className="w-10 h-10 animate-spin text-[#6B48C8] mb-4" />
                <p className="text-slate-500 font-medium">Loading natural voices...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 relative z-10 w-full mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/playbook" className="hover:text-[#6B48C8] transition-colors">Playbook</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Voice Lullaby</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Voice Lullaby Studio
                    </h1>
                    <p className="text-sm text-[#4a4b5e] mt-1">
                        High-quality, natural AI voices for your baby.
                    </p>
                </div>

                <button
                    onClick={() => setIsSoothingMode(!isSoothingMode)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                        isSoothingMode
                            ? "bg-[#EAE2FB] border-[#6B48C8]/30 text-[#6B48C8] shadow-sm tracking-wide"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <Moon className={`w-3.5 h-3.5 ${isSoothingMode ? "fill-[#6B48C8]" : ""}`} />
                    Soothing Mode
                </button>
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
