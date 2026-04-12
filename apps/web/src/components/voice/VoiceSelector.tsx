"use client";

import { Mic2, Check, User } from "lucide-react";
import { type VoiceInfo } from "@/lib/api";

interface VoiceSelectorProps {
    voices: VoiceInfo[];
    selectedVoiceId: string;
    onSelectVoice: (voiceId: string) => void;
}

export function VoiceSelector({ voices, selectedVoiceId, onSelectVoice }: VoiceSelectorProps) {
    return (
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
                        onClick={() => onSelectVoice(voice.voice_id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 ${
                            selectedVoiceId === voice.voice_id
                                ? "bg-[#EAE2FB] border-[#6B48C8]/30 shadow-sm"
                                : "bg-white/50 border-white/80 hover:bg-white/80"
                        }`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            selectedVoiceId === voice.voice_id ? "bg-[#6B48C8] text-white" : "bg-slate-100 text-slate-400"
                        }`}>
                            {selectedVoiceId === voice.voice_id ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                        </div>
                        <div className="text-left min-w-0">
                            <p className={`text-xs font-bold truncate ${
                                selectedVoiceId === voice.voice_id ? "text-[#6B48C8]" : "text-[#1a1b2e]"
                            }`}>
                                {voice.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{voice.style}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
