"use client";

import { Play, Pause, Loader2 } from "lucide-react";
import { type LullabyInfo } from "@/lib/api";

interface LullabyLibraryProps {
    lullabies: LullabyInfo[];
    playingId: string | null;
    isPlaying: boolean;
    generating: boolean;
    onPlay: (lullaby: LullabyInfo) => void;
    onTogglePause: () => void;
}

export function LullabyLibrary({
    lullabies,
    playingId,
    isPlaying,
    generating,
    onPlay,
    onTogglePause
}: LullabyLibraryProps) {
    return (
        <div className="space-y-3">
            {lullabies.map((lullaby) => {
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
                                onClick={() => isActive ? onTogglePause() : onPlay(lullaby)}
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
    );
}
