"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
    getSoothePlan,
    submitSootheFeedback,
    type SootheTechnique,
    type SoothePlanResult,
} from "@/lib/api";
import { ChevronDown, ChevronUp, Check, X, Loader2, Timer, Award, Sparkles } from "lucide-react";

interface SoothePanelProps {
    childId: string;
    need: string;
    confidence: number;
}

export function SoothePanel({ childId, need, confidence }: SoothePanelProps) {
    const { getToken } = useAuth();
    const [plan, setPlan] = useState<SoothePlanResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [feedbackStates, setFeedbackStates] = useState<Record<string, "success" | "fail" | "pending" | null>>({});

    const fetchPlan = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) return;
            const result = await getSoothePlan(token, childId, need, confidence);
            setPlan(result);
            // Auto-expand first technique
            if (result.techniques.length > 0) {
                setExpandedId(result.techniques[0].technique_id);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load soothe plan");
        } finally {
            setLoading(false);
        }
    }, [getToken, childId, need, confidence]);

    useEffect(() => {
        fetchPlan();
    }, [fetchPlan]);

    const handleFeedback = async (technique: SootheTechnique, outcome: "success" | "fail") => {
        setFeedbackStates((prev) => ({ ...prev, [technique.technique_id]: "pending" }));
        try {
            const token = await getToken();
            if (!token) return;
            await submitSootheFeedback(token, {
                child_id: childId,
                need,
                technique_id: technique.technique_id,
                outcome,
            });
            setFeedbackStates((prev) => ({ ...prev, [technique.technique_id]: outcome }));
        } catch {
            setFeedbackStates((prev) => ({ ...prev, [technique.technique_id]: null }));
        }
    };

    // Need colors
    const NEED_COLORS: Record<string, { text: string; bg: string; border: string }> = {
        hungry: { text: "#F3A595", bg: "#FFE5E0", border: "#F3A595" },
        sleepy: { text: "#6B48C8", bg: "#EAE2FB", border: "#D8D0F0" },
        diaper: { text: "#3AADDB", bg: "#D6F4FF", border: "#93E2FA" },
        pain:   { text: "#F0897A", bg: "#FFE5E0", border: "#F0897A" },
        calm:   { text: "#7BC89D", bg: "#D5F5E3", border: "#B5EAC5" },
    };

    const nc = NEED_COLORS[need] || NEED_COLORS.calm;

    if (loading) {
        return (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8">
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#F0897A]" />
                    <span className="text-[#4a4b5e] font-medium">Loading soothe plan...</span>
                </div>
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 text-center">
                <p className="text-[#4a4b5e]">{error || "No soothe plan available."}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-5 h-5" style={{ color: nc.text }} />
                    <h2 className="text-xl font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Soothe Plan
                    </h2>
                    <span
                        className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                        style={{ backgroundColor: nc.bg, color: nc.text }}
                    >
                        {need}
                    </span>
                    {plan.personalised && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#EAE2FB] text-[#6B48C8] flex items-center gap-1 ml-auto">
                            <Award className="w-3 h-3" />
                            Personalised
                        </span>
                    )}
                </div>
                <p className="text-sm text-[#4a4b5e]">
                    {plan.personalised
                        ? "Ranked by what's worked best for your baby."
                        : "Try these techniques. Your feedback will personalise the order over time."}
                </p>
            </div>

            {/* Technique Cards */}
            {plan.techniques.map((technique, index) => {
                const isExpanded = expandedId === technique.technique_id;
                const fbState = feedbackStates[technique.technique_id];

                return (
                    <div
                        key={technique.technique_id}
                        className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl overflow-hidden transition-all duration-300"
                    >
                        {/* Technique Header — always visible */}
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : technique.technique_id)}
                            className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/40 transition-colors"
                        >
                            {/* Rank badge */}
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                style={{
                                    backgroundColor: index === 0 ? nc.bg : "#F1F1F4",
                                    color: index === 0 ? nc.text : "#9CA3AF",
                                }}
                            >
                                {index + 1}
                            </div>

                            {/* Icon */}
                            <span className="text-2xl shrink-0">{technique.icon}</span>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="text-base font-bold text-[#1a1b2e] truncate">
                                        {technique.name}
                                    </h3>
                                    {technique.success_rate !== null && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D5F5E3] text-[#4CAF50] shrink-0">
                                            {Math.round(technique.success_rate * 100)}% success
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[#4a4b5e] truncate">
                                    {technique.description}
                                </p>
                            </div>

                            {/* Timer badge */}
                            {technique.timer_seconds && (
                                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                                    <Timer className="w-3.5 h-3.5" />
                                    <span>{Math.round(technique.timer_seconds / 60)}m</span>
                                </div>
                            )}

                            {/* Expand toggle */}
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                            )}
                        </button>

                        {/* Expanded: Steps + Feedback */}
                        {isExpanded && (
                            <div className="px-5 pb-5 pt-0 border-t border-slate-100 animate-fade-in">
                                {/* Steps */}
                                <div className="space-y-2.5 mt-4 mb-5">
                                    {technique.steps.map((step, i) => (
                                        <div key={i} className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-[11px] font-bold text-slate-500">{i + 1}</span>
                                            </div>
                                            <p className="text-sm text-[#4a4b5e] leading-relaxed">{step}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Feedback buttons */}
                                <div className="border-t border-slate-100 pt-4">
                                    {fbState === "success" ? (
                                        <div className="flex items-center gap-2 text-sm font-medium text-[#4CAF50] bg-[#D5F5E3] px-4 py-2.5 rounded-2xl">
                                            <Check className="w-4 h-4" />
                                            Great — we'll rank this higher next time!
                                        </div>
                                    ) : fbState === "fail" ? (
                                        <div className="flex items-center gap-2 text-sm font-medium text-[#F0897A] bg-[#FFE5E0] px-4 py-2.5 rounded-2xl">
                                            <X className="w-4 h-4" />
                                            Got it — we'll suggest alternatives instead.
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 font-medium">Did this help?</span>
                                            <button
                                                onClick={() => handleFeedback(technique, "success")}
                                                disabled={fbState === "pending"}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#D5F5E3] text-[#4CAF50] text-sm font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                                            >
                                                {fbState === "pending" ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="w-3.5 h-3.5" />
                                                )}
                                                This worked
                                            </button>
                                            <button
                                                onClick={() => handleFeedback(technique, "fail")}
                                                disabled={fbState === "pending"}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 text-slate-500 text-sm font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Didn&apos;t help
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
