"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";
import { StyleChips } from "./StyleChips";
import { type LucideIcon } from "lucide-react";

interface StoryTheme {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

interface StoryStyle {
    id: string;
    label: string;
}

interface BookGeneratorProps {
    show: boolean;
    generating: boolean;
    childName: string;
    selectedTheme: string;
    selectedStyle: string;
    themes: StoryTheme[];
    styles: StoryStyle[];
    onChildNameChange: (name: string) => void;
    onThemeSelect: (id: string) => void;
    onStyleSelect: (id: string) => void;
    onGenerate: () => void;
}

export function BookGenerator({
    show,
    generating,
    childName,
    selectedTheme,
    selectedStyle,
    themes,
    styles,
    onChildNameChange,
    onThemeSelect,
    onStyleSelect,
    onGenerate
}: BookGeneratorProps) {
    if (!show) return null;

    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#6B48C8]" />
                <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                    Create a New Story
                </h2>
            </div>

            {/* Child Name */}
            <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                    Main character name
                </label>
                <input
                    type="text"
                    value={childName}
                    onChange={(e) => onChildNameChange(e.target.value)}
                    placeholder="Your baby's name"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#1a1b2e] focus:outline-none focus:ring-2 focus:ring-[#F0897A]/30 focus:border-[#F0897A]"
                />
            </div>

            <ThemeSelector 
                themes={themes} 
                selectedThemeId={selectedTheme} 
                onSelectTheme={onThemeSelect} 
            />

            <StyleChips 
                styles={styles} 
                selectedStyleId={selectedStyle} 
                onSelectStyle={onStyleSelect} 
            />

            {/* Generate Button */}
            <button
                onClick={onGenerate}
                disabled={generating || !childName.trim()}
                className="w-full px-6 py-3.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {generating ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating story...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        Generate Book
                    </>
                )}
            </button>
        </div>
    );
}
