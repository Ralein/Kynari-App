"use client";

import { Volume2, Loader2, Pause, Play, Square } from "lucide-react";
import { type LullabyInfo, type VoiceInfo } from "@/lib/api";

interface NowPlayingBarProps {
    generating: boolean;
    playingId: string | null;
    currentLullaby: LullabyInfo | null;
    isPlaying: boolean;
    progress: number;
    selectedVoice: string;
    voices: VoiceInfo[];
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
    onTogglePause,
    onStop
}: NowPlayingBarProps) {
    if (!(playingId || generating) || !currentLullaby) return null;

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
                    <p className="text-xs text-slate-500">
                        {generating ? "Generating audio..." : `Voice: ${voices.find(v => v.voice_id === selectedVoice)?.name || selectedVoice}`}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onTogglePause}
                        disabled={generating}
                        className="w-10 h-10 rounded-full bg-[#3AADDB] text-white flex items-center justify-center hover:bg-[#2E9AC2] transition-colors disabled:opacity-50"
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
