"use client";

import { BookOpen, Calendar } from "lucide-react";
import { type WeeklyNarrative as WeeklyNarrativeType } from "@/lib/api";

interface WeeklyNarrativeProps {
    narratives: WeeklyNarrativeType[];
}

export function WeeklyNarrative({ narratives }: WeeklyNarrativeProps) {
    if (!narratives || narratives.length === 0) return null;

    return (
        <div className="space-y-3">
            <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#6B48C8]" />
                Weekly Stories
            </h2>
            {narratives.map((narrative) => (
                <div
                    key={narrative.id}
                    className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-[#6B48C8]" />
                        <span className="text-xs font-semibold text-[#6B48C8]">
                            {narrative.week_start} — {narrative.week_end}
                        </span>
                    </div>
                    <p className="text-sm text-[#4a4b5e] leading-relaxed">
                        {narrative.narrative}
                    </p>
                </div>
            ))}
        </div>
    );
}
