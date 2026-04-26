"use client";
import { useState } from "react";

import { Volume2, Loader2, Pause, Play, Square, Zap, Repeat, Clock, Shuffle } from "lucide-react";
import { type LullabyInfo, type VoiceInfo } from "@/lib/api";

interface NowPlayingBarProps {
    generating: boolean;
    playingId: string | null;
    currentLullaby: LullabyInfo | null;
    isPlaying: boolean;
    progress: number;
    selectedVoice: string;
    voices: VoiceInfo[];
    activeSpeed?: number;
    isLooping: boolean;
    isShuffling: boolean;
    sleepTimer: number | null;
    onToggleLoop: () => void;
    onToggleShuffle: () => void;
    onSetTimer: (minutes: number | null) => void;
    onTogglePause: () => void;
    onStop: () => void;
}

export function NowPlayingBar({
    generating,
    playingId,
    currentLullaby,
    isPlaying,
    progress,
    selectedVoice,
    voices,
    activeSpeed,
    isLooping,
    isShuffling,
    sleepTimer,
    onToggleLoop,
    onToggleShuffle,
    onSetTimer,
    onTogglePause,
    onStop
}: NowPlayingBarProps) {
    const [showTimerMenu, setShowTimerMenu] = useState(false);

    if (!(playingId || generating) || !currentLullaby) return null;

    const voiceName = voices.find(v => v.voice_id === selectedVoice)?.name || selectedVoice;

    return (
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
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-500">
                            {generating ? "Generating audio..." : `Voice: ${voiceName}`}
                        </p>
                        {activeSpeed && activeSpeed !== 1.0 && !generating && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFF4E5] text-[#F0897A] text-[10px] font-bold">
                                <Zap className="w-2.5 h-2.5 fill-[#F0897A]" />
                                {activeSpeed}x
                            </span>
                        )}
                        {sleepTimer !== null && !generating && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#D6F4FF] text-[#3AADDB] text-[10px] font-bold animate-pulse">
                                <Clock className="w-2.5 h-2.5" />
                                {sleepTimer}m
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Loop Toggle */}
                    <button
                        onClick={onToggleLoop}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            isLooping 
                                ? "bg-[#EAE2FB] text-[#6B48C8] shadow-sm" 
                                : "bg-slate-50 text-slate-400 hover:text-slate-600"
                        }`}
                        title="Loop Lullaby"
                    >
                        <Repeat className={`w-4 h-4 ${isLooping ? "stroke-[2.5px]" : ""}`} />
                    </button>

                    {/* Shuffle */}
                    <button
                        onClick={onToggleShuffle}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            isShuffling 
                                ? "bg-[#B5EAC5] text-[#2D8A4E] shadow-sm" 
                                : "bg-slate-50 text-slate-400 hover:text-slate-600"
                        }`}
                        title="Shuffle Mode"
                    >
                        <Shuffle className={`w-4 h-4 ${isShuffling ? "stroke-[2.5px]" : ""}`} />
                    </button>

                    {/* Sleep Timer */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setShowTimerMenu(true)}
                        onMouseLeave={() => setShowTimerMenu(false)}
                    >
                        <button
                            onClick={() => setShowTimerMenu(!showTimerMenu)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                sleepTimer !== null 
                                    ? "bg-[#D6F4FF] text-[#3AADDB] shadow-sm" 
                                    : "bg-slate-50 text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <Clock className={`w-4 h-4 ${sleepTimer !== null ? "stroke-[2.5px]" : ""}`} />
                        </button>
                        
                        {/* Timer Menu */}
                        {showTimerMenu && (
                            <div className="absolute bottom-full right-0 mb-0 pb-2 z-20 group">
                                <div className="bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 min-w-[130px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="px-3 py-1.5 mb-1 border-b border-slate-50">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sleep Timer</span>
                                    </div>
                                    {[15, 30, 45, 60].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                onSetTimer(m);
                                                setShowTimerMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                                sleepTimer === m 
                                                    ? "bg-[#D6F4FF] text-[#3AADDB]" 
                                                    : "hover:bg-slate-50 text-[#1a1b2e]"
                                            }`}
                                        >
                                            {m} minutes
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            onSetTimer(null);
                                            setShowTimerMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-rose-50 text-rose-500 transition-colors mt-1"
                                    >
                                        Turn Off
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-100 mx-1" />

                    <button
                        onClick={onTogglePause}
                        disabled={generating}
                        className="w-10 h-10 rounded-full bg-[#3AADDB] text-white flex items-center justify-center hover:bg-[#2E9AC2] transition-colors shadow-md disabled:opacity-50"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button
                        onClick={onStop}
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
    );
}
