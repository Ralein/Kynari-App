"use client";

import { useState, useEffect } from "react";
import { Search, Brain, Target, ScanFace, Scan, Baby } from "lucide-react";

const ANALYSIS_PHASES: { label: string; Icon: React.FC<{ className?: string }> }[] = [
    { label: "Detecting face landmarks…", Icon: ({ className }) => <Search className={className} /> },
    { label: "Running neural network…", Icon: ({ className }) => <Brain className={className} /> },
    { label: "Classifying expression…", Icon: ({ className }) => <ScanFace className={className} /> },
    { label: "Mapping action units…", Icon: ({ className }) => <Scan className={className} /> },
    { label: "Predicting baby needs…", Icon: ({ className }) => <Target className={className} /> },
];

export function AnalyzingOverlay() {
    const [phaseIndex, setPhaseIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPhaseIndex((prev) => Math.min(prev + 1, ANALYSIS_PHASES.length - 1));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const progressPct = Math.min(Math.round(((phaseIndex + 1) / ANALYSIS_PHASES.length) * 100), 96);
    const { Icon, label } = ANALYSIS_PHASES[phaseIndex];

    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 sm:p-10 animate-fade-in overflow-hidden">
            <div className="flex flex-col items-center text-center">

                {/* Animated scanning area */}
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-8">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute w-28 h-28 rounded-full border-2 border-primary-300/40 animate-ring-1" />
                        <div className="absolute w-28 h-28 rounded-full border-2 border-primary-300/30 animate-ring-2" />
                        <div className="absolute w-28 h-28 rounded-full border-2 border-primary-300/20 animate-ring-3" />
                    </div>
                    <div className="absolute inset-6 sm:inset-8 rounded-full bg-gradient-to-br from-primary-100 via-primary-50 to-white border-2 border-[#EAE2FB]/60 shadow-inner" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Baby className="w-14 h-14 text-[#6B48C8]/20" strokeWidth={1} />
                    </div>
                    <div className="absolute inset-x-6 sm:inset-x-8 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary-500/70 to-transparent animate-scan-beam" />
                    <div className="absolute inset-0 flex items-center justify-center animate-magnify-scan">
                        <Search className="w-10 h-10 sm:w-12 sm:h-12 text-[#6B48C8] drop-shadow-lg" strokeWidth={2.5} />
                    </div>
                </div>

                {/* Text */}
                <h3 className="text-xl font-extrabold text-[#1a1b2e] mb-1.5 font-[family-name:var(--font-sans)]">
                    Analyzing…
                </h3>
                <div className="flex items-center gap-2 h-6 mb-6">
                    <Icon className="w-4 h-4 text-[#6B48C8]" />
                    <p className="text-sm text-[#6B48C8] font-semibold transition-all duration-500">
                        {label}
                    </p>
                </div>

                {/* Step dots */}
                <div className="flex items-center gap-1.5 mb-5">
                    {ANALYSIS_PHASES.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all duration-500 ${i <= phaseIndex
                                ? "w-6 bg-gradient-to-r from-primary-500 to-primary-400"
                                : "w-2 bg-[#EAE2FB]/60"
                                }`}
                        />
                    ))}
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs">
                    <div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden shadow-inner">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 transition-all duration-700 ease-out relative"
                            style={{ width: `${progressPct}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse-soft" />
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-[11px] text-slate-500">This usually takes a few seconds</p>
                        <p className="text-[11px] font-bold text-[#6B48C8]">{progressPct}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
