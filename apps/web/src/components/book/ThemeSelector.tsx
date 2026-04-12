"use client";

import { type LucideIcon } from "lucide-react";

interface StoryTheme {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

interface ThemeSelectorProps {
    themes: StoryTheme[];
    selectedThemeId: string;
    onSelectTheme: (themeId: string) => void;
}

export function ThemeSelector({ themes, selectedThemeId, onSelectTheme }: ThemeSelectorProps) {
    return (
        <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2">
                Story theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {themes.map((theme) => {
                    const Icon = theme.icon;
                    return (
                        <button
                            key={theme.id}
                            onClick={() => onSelectTheme(theme.id)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                                selectedThemeId === theme.id
                                    ? "border-[#F0897A]/30 shadow-sm"
                                    : "bg-white/50 border-white/80 hover:bg-white/80"
                            }`}
                            style={selectedThemeId === theme.id ? { backgroundColor: `${theme.color}15` } : undefined}
                        >
                            <Icon className="w-5 h-5" style={{ color: theme.color }} />
                            <span className="text-xs font-semibold text-[#1a1b2e]">{theme.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
