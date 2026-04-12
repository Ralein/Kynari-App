"use client";

import { Palette } from "lucide-react";

interface StoryStyle {
    id: string;
    label: string;
}

interface StyleChipsProps {
    styles: StoryStyle[];
    selectedStyleId: string;
    onSelectStyle: (styleId: string) => void;
}

export function StyleChips({ styles, selectedStyleId, onSelectStyle }: StyleChipsProps) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-2">
                <Palette className="w-3.5 h-3.5 text-[#6B48C8]" />
                <label className="text-xs font-semibold text-slate-500">
                    Art style
                </label>
            </div>
            <div className="flex gap-2">
                {styles.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => onSelectStyle(style.id)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                            selectedStyleId === style.id
                                ? "bg-[#6B48C8] text-white shadow-sm"
                                : "bg-white/70 text-slate-500 border border-white/80 hover:bg-white/90"
                        }`}
                    >
                        {style.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
