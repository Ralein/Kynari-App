"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
    ChevronRight,
    Loader2,
    Moon,
    Timer,
    Plus,
    Sparkles,
} from "lucide-react";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { NowPlayingBar } from "@/components/voice/NowPlayingBar";
import { MoodFilter } from "@/components/voice/MoodFilter";
import { LullabyLibrary } from "@/components/voice/LullabyLibrary";
import { getVoices, getLullabies, generateLullabyUrl, type VoiceInfo, type LullabyInfo, generateSpeechUrl } from "@/lib/api";

const MOOD_CHIPS = [
    { id: "all", label: "All", color: "#F0897A" },
    { id: "sleepy", label: "Sleepy", color: "#6B48C8" },
    { id: "calm", label: "Calm", color: "#93E2FA" },
    { id: "comfort", label: "Comfort", color: "#F3A595" },
    { id: "playful", label: "Playful", color: "#B5EAC5" },
    { id: "personal", label: "Personal", color: "#FFB347" },
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
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [sleepTimer, setSleepTimer] = useState<number | null>(null); // minutes
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [customText, setCustomText] = useState("");
    const [personalLullabies, setPersonalLullabies] = useState<LullabyInfo[]>([]);
    const [playbackSpeed, setPlaybackSpeed] = useState(0.9);
    const [shuffleQueue, setShuffleQueue] = useState<string[]>([]);

    const allLullabies = useMemo(() => [...lullabies, ...personalLullabies], [lullabies, personalLullabies]);

    const filteredLullabies = useMemo(() => activeMood === "all"
        ? allLullabies
        : allLullabies.filter((l) => l.mood === activeMood), [allLullabies, activeMood]);

    // Audio Refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);
    const preloadedLullabyRef = useRef<LullabyInfo | null>(null);

    // Load voices and lullabies from API
    useEffect(() => {
        // Load personal lullabies from localStorage
        const saved = localStorage.getItem("kynari_personal_lullabies");
        if (saved) {
            try {
                setPersonalLullabies(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse personal lullabies", e);
            }
        }

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

    // Save personal lullabies to localStorage
    useEffect(() => {
        localStorage.setItem("kynari_personal_lullabies", JSON.stringify(personalLullabies));
    }, [personalLullabies]);

    const stopPlayback = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        // Also clear preload
        if (preloadedAudioRef.current) {
            preloadedAudioRef.current.pause();
            preloadedAudioRef.current = null;
        }
        preloadedLullabyRef.current = null;
        
        setIsPlaying(false);
        setPlayingId(null);
        setCurrentLullaby(null);
        setProgress(0);
    }, []);

    // Component Unmount Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (preloadedAudioRef.current) {
                preloadedAudioRef.current.pause();
                preloadedAudioRef.current = null;
            }
        };
    }, []);

    // Clear preload if settings change
    useEffect(() => {
        preloadedAudioRef.current = null;
        preloadedLullabyRef.current = null;
    }, [selectedVoice, playbackSpeed, isSoothingMode]);

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

            // Soothing mode forces 0.8 speed, otherwise use current selected speed
            const activeVoice = isSoothingMode ? "af_heart" : selectedVoice;
            const activeSpeed = isSoothingMode ? 0.8 : playbackSpeed;
            
            const url = lullaby.mood === "personal" 
                ? generateSpeechUrl(token, activeVoice, lullaby.lyrics, activeSpeed)
                : generateLullabyUrl(token, activeVoice, lullaby.id, activeSpeed);

            const audio = new Audio(url);
            audio.loop = isLooping;
            audioRef.current = audio;
            
            audio.oncanplay = () => {
                setGenerating(false);
                audio.play();
                setIsPlaying(true);
            };

            audio.onerror = () => {
                console.error("Audio playback error");
                setGenerating(false);
                setPlayingId(null);
            };

        } catch (err) {
            console.error("Lullaby generation failed:", err);
            setPlayingId(null);
            setCurrentLullaby(null);
            setGenerating(false);
        }
    }, [selectedVoice, isSoothingMode, playbackSpeed, isLooping, getToken]);

    const shuffleRhymes = useCallback(() => {
        if (allLullabies.length === 0) return;
        
        let nextQueue = [...shuffleQueue];
        if (nextQueue.length === 0) {
            // Refill and shuffle IDs
            nextQueue = allLullabies.map(l => l.id).sort(() => Math.random() - 0.5);
            // Don't start with the current one if possible
            if (currentLullaby && nextQueue[0] === currentLullaby.id && nextQueue.length > 1) {
                const first = nextQueue.shift()!;
                nextQueue.push(first);
            }
        }

        const nextId = nextQueue.shift()!;
        setShuffleQueue(nextQueue);
        
        const nextLullaby = allLullabies.find(l => l.id === nextId);
        if (nextLullaby) {
            playLullaby(nextLullaby);
        }
    }, [allLullabies, currentLullaby, shuffleQueue, playLullaby]);

    const playNextRhyme = useCallback(() => {
        if (allLullabies.length === 0 || !currentLullaby) {
            stopPlayback();
            return;
        }
        
        const currentIndex = allLullabies.findIndex(l => l.id === currentLullaby.id);
        if (currentIndex === -1 || currentIndex === allLullabies.length - 1) {
            stopPlayback();
        } else {
            playLullaby(allLullabies[currentIndex + 1]);
        }
    }, [allLullabies, currentLullaby, playLullaby, stopPlayback]);

    const preloadNext = useCallback(async () => {
        if (allLullabies.length === 0 || !currentLullaby || preloadedLullabyRef.current) return;

        let nextLullaby: LullabyInfo | undefined;
        if (isShuffling) {
            // Look ahead in the shuffle queue if it exists
            const nextId = shuffleQueue[0];
            if (nextId) {
                nextLullaby = allLullabies.find(l => l.id === nextId);
            } else {
                // If queue is empty, just pick a random one that isn't the current one
                const others = allLullabies.filter(l => l.id !== currentLullaby.id);
                nextLullaby = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : currentLullaby;
            }
        } else {
            const currentIndex = allLullabies.findIndex(l => l.id === currentLullaby.id);
            if (currentIndex !== -1 && currentIndex < allLullabies.length - 1) {
                nextLullaby = allLullabies[currentIndex + 1];
            }
        }

        if (!nextLullaby) return;

        try {
            const token = await getToken();
            if (!token) return;

            const activeVoice = isSoothingMode ? "af_heart" : selectedVoice;
            const activeSpeed = isSoothingMode ? 0.8 : playbackSpeed;
            
            const url = nextLullaby.mood === "personal"
                ? generateSpeechUrl(token, activeVoice, nextLullaby.lyrics, activeSpeed)
                : generateLullabyUrl(token, activeVoice, nextLullaby.id, activeSpeed);

            const audio = new Audio(url);
            audio.preload = "auto";
            preloadedAudioRef.current = audio;
            preloadedLullabyRef.current = nextLullaby;
            
            audio.load();
        } catch (err) {
            console.error("Preload failed:", err);
        }
    }, [allLullabies, currentLullaby, isShuffling, shuffleQueue, isSoothingMode, selectedVoice, playbackSpeed, getToken]);

    // Load voices and lullabies from API
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            const pct = (audio.currentTime / audio.duration) * 100;
            setProgress(isNaN(pct) ? 0 : pct);

            // Preload next rhyme when current is 80% done
            if (pct > 80 && !preloadedLullabyRef.current && !isLooping) {
                preloadNext();
            }
        };

        const handleEnded = () => {
            if (isLooping) return; // Handled by audio.loop

            if (preloadedLullabyRef.current && preloadedAudioRef.current) {
                // Use preloaded audio
                const nextLullaby = preloadedLullabyRef.current;
                const nextAudio = preloadedAudioRef.current;
                
                // Clear current
                if (audioRef.current) {
                    audioRef.current.pause();
                }
                
                // Swap
                setPlayingId(nextLullaby.id);
                setCurrentLullaby(nextLullaby);
                setGenerating(false);
                setProgress(0);
                
                audioRef.current = nextAudio;
                nextAudio.play();
                setIsPlaying(true);
                
                // Reset preload refs for next cycle
                preloadedLullabyRef.current = null;
                preloadedAudioRef.current = null;
            } else {
                // Fallback to regular shuffle/next if preload isn't ready
                if (isShuffling) {
                    shuffleRhymes();
                } else {
                    playNextRhyme();
                }
            }
        };

        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateProgress);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [isLooping, isShuffling, shuffleRhymes, playNextRhyme, preloadNext]);

    // Timer logic
    useEffect(() => {
        if (secondsLeft === null || !isPlaying) return;

        if (secondsLeft <= 0) {
            stopPlayback();
            setSleepTimer(null);
            setSecondsLeft(null);
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev === null) return null;
                const next = prev - 1;
                // Update the minutes state every minute for the UI badge
                if (next % 60 === 0) {
                    setSleepTimer(next / 60);
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [secondsLeft, isPlaying, stopPlayback]);

    const setTimerMinutes = (mins: number | null) => {
        setSleepTimer(mins);
        setSecondsLeft(mins ? mins * 60 : null);
    };

    const selectVoice = useCallback((voiceId: string) => {
        setSelectedVoice(voiceId);
    }, []);



    const playCustomRhyme = useCallback(async () => {
        if (!customText.trim()) return;

        // Stop current audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const dummyLullaby: LullabyInfo = {
            id: "custom",
            title: "Custom Rhyme",
            lyrics: customText,
            mood: "custom",
            origin: "AI Generated",
            duration_estimate: 0
        };

        setPlayingId("custom");
        setCurrentLullaby(dummyLullaby);
        setGenerating(true);
        setProgress(0);
        setIsPlaying(false);

        try {
            const token = await getToken();
            if (!token) throw new Error("No token");

            const activeVoice = isSoothingMode ? "af_heart" : selectedVoice;
            const activeSpeed = isSoothingMode ? 0.8 : playbackSpeed;
            
            const url = generateSpeechUrl(token, activeVoice, customText, activeSpeed);

            const audio = new Audio(url);
            audio.loop = isLooping;
            audioRef.current = audio;
            
            audio.oncanplay = () => {
                setGenerating(false);
                audio.play();
                setIsPlaying(true);
            };

            audio.onerror = () => {
                console.error("Custom audio playback error");
                setGenerating(false);
                setPlayingId(null);
            };
        } catch (err) {
            console.error("Custom rhyme playback failed:", err);
            setPlayingId(null);
            setGenerating(false);
        }
    }, [customText, selectedVoice, isSoothingMode, playbackSpeed, isLooping, getToken]);

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

    const toggleLoop = useCallback(() => {
        const newLoop = !isLooping;
        setIsLooping(newLoop);
        if (audioRef.current) {
            audioRef.current.loop = newLoop;
        }
    }, [isLooping]);

    const toggleShuffle = useCallback(() => {
        setIsShuffling(!isShuffling);
    }, [isShuffling]);

    const handleSeek = (pct: number) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        
        audio.currentTime = (pct / 100) * audio.duration;
        setProgress(pct);
    };

    const addToPersonalList = () => {
        if (!customText.trim()) return;
        
        const newLullaby: LullabyInfo = {
            id: `personal-${Date.now()}`,
            title: customText.slice(0, 20) + (customText.length > 20 ? "..." : ""),
            lyrics: customText,
            mood: "personal",
            origin: "My Custom Lullaby",
            duration_estimate: 0
        };

        setPersonalLullabies(prev => [newLullaby, ...prev]);
        setCustomText("");
        setActiveMood("personal"); // Auto-switch to personal to show it
    };


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

                <div className="flex items-center gap-4">
                    {/* Speed Control */}
                    <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <Timer className="w-4 h-4 text-[#F0897A]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Speed</span>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={playbackSpeed}
                                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                                    className="w-24 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#F0897A]"
                                />
                                <span className="text-xs font-bold text-[#1a1b2e] w-8">{playbackSpeed}x</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsSoothingMode(!isSoothingMode)}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                            isSoothingMode
                                ? "bg-[#EAE2FB] border-[#6B48C8]/30 text-[#6B48C8] shadow-sm tracking-wide"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                    >
                        <Moon className={`w-3.5 h-3.5 ${isSoothingMode ? "fill-[#6B48C8]" : ""}`} />
                        Soothing Mode
                    </button>
                </div>
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
                activeSpeed={isSoothingMode ? 0.8 : playbackSpeed}
                isLooping={isLooping}
                isShuffling={isShuffling}
                sleepTimer={sleepTimer}
                onToggleLoop={toggleLoop}
                onToggleShuffle={toggleShuffle}
                onSetTimer={setTimerMinutes}
                onTogglePause={togglePause}
                onStop={stopPlayback}
                onSeek={handleSeek}
            />

            {/* Custom Rhyme Section */}
            <div className="bg-gradient-to-br from-[#FFF4E5] to-[#FFEDD5] rounded-[2.5rem] p-6 border border-orange-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-orange-200/50 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#1a1b2e]">Custom Lullaby</h3>
                        <p className="text-xs text-orange-700/70">Create a personalized rhyme for your little one</p>
                    </div>
                </div>
                
                <div className="relative">
                    <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Twinkle twinkle little star, daddy loves you as you are..."
                        className="w-full h-32 bg-white/80 backdrop-blur-sm border-2 border-orange-100 rounded-2xl p-4 text-sm text-[#1a1b2e] placeholder:text-slate-400 focus:outline-none focus:border-orange-300 transition-all resize-none"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                        <button
                            onClick={addToPersonalList}
                            disabled={!customText.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-orange-600 border border-orange-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add to list
                        </button>
                        <button
                            onClick={playCustomRhyme}
                            disabled={generating || !customText.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                        >
                            {generating && playingId === "custom" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Play Lullaby
                        </button>
                    </div>
                </div>
            </div>

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
