"use client";

import { type LucideIcon } from "lucide-react";

interface NatureSound {
    id: string;
    name: string;
    icon: LucideIcon;
}

interface NatureSoundSelectorProps {
    sounds: NatureSound[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export function NatureSoundSelector({ sounds, selectedId, onSelect }: NatureSoundSelectorProps) {
    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
            <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-4">
                Nature Sound
            </h2>
            <div className="grid grid-cols-4 gap-2.5">
                {sounds.map((sound) => {
                    const Icon = sound.icon;
                    return (
                        <button
                            key={sound.id}
                            onClick={() => onSelect(sound.id)}
                            className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 ${
                                selectedId === sound.id
                                    ? "bg-[#D6F4FF] border-[#93E2FA]/50 shadow-sm"
                                    : "bg-white/50 border-white/80 hover:bg-white/80"
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${
                                selectedId === sound.id ? "text-[#3AADDB]" : "text-slate-400"
                            }`} />
                            <span className={`text-xs font-semibold ${
                                selectedId === sound.id ? "text-[#3AADDB]" : "text-slate-500"
                            }`}>
                                {sound.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
