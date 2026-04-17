import { type NeedLabel, DISTRESS_SCALE, NEED_COLORS, NEED_EMOJI, NEED_ADVICE } from "@kynari/shared";
import { CheckCircle2, Stethoscope, Lightbulb, Volume2, ThumbsUp, ThumbsDown, Link2, Radio, ScanFace, FileStack, Save, Activity, AudioLines, Heart, ChevronRight } from "lucide-react";

export type AnalysisResult = {
    type: "face" | "audio" | "video";
    need_label?: string;
    need_description?: string;
    confidence?: number;
    secondary_need?: string;
    all_needs?: Record<string, number>;
    distress_score?: number;
    distress_intensity?: string;
    stress_features?: Record<string, number>;
    fusion_weights?: Record<string, number>;
    expression?: string;
    expression_confidence?: number;
    raw?: Record<string, unknown>;
};

function getSeverity(score: number): "low" | "medium" | "high" {
    if (score < 0.35) return "low";
    if (score < 0.65) return "medium";
    return "high";
}

function getDistressLevel(score: number): number {
    return Math.round(score * 10);
}

function getDistressInfo(level: number) {
    return DISTRESS_SCALE.find(s => level >= s.min && level <= s.max) || DISTRESS_SCALE[0];
}

// Map expression strings to emoji for display
function getExpressionEmoji(expression: string): string {
    const map: Record<string, string> = {
        crying: "😭",
        distressed: "😫",
        angry: "😠",
        sad: "😢",
        fussy: "😤",
        uncomfortable: "😟",
        neutral: "😐",
        calm: "😊",
        content: "🙂",
    };
    return map[expression] ?? "😐";
}

interface AnalysisResultCardProps {
    result: AnalysisResult;
    childrenData: Array<{ id: string; name: string }> | undefined;
    selectedChild: string;
    feedbackGiven: boolean;
    setFeedbackGiven: (val: boolean) => void;
    saved: boolean;
    handleSave: () => void;
    onBoostWithAudio: (rawResult: unknown) => void;
    onShowPlaybookPlan?: (need: string, confidence: number) => void;
}

export function AnalysisResultCard({ result, childrenData, selectedChild, feedbackGiven, setFeedbackGiven, saved, handleSave, onBoostWithAudio, onShowPlaybookPlan }: AnalysisResultCardProps) {
    const primaryScore = result.confidence ?? result.distress_score ?? 0;
    const severity = getSeverity(primaryScore);
    const distressLevel = getDistressLevel(result.distress_score ?? primaryScore);
    const distressInfo = getDistressInfo(distressLevel);
    const needKey = (result.need_label || (result.distress_score !== undefined ? (result.distress_score > 0.5 ? "pain" : "calm") : "calm")) as NeedLabel;
    const advice = NEED_ADVICE[needKey];

    // Extract cry detection info from raw result
    const cryDetection = result.raw?.cry_detection as { is_crying?: boolean; cry_confidence?: number; audio_type?: string } | undefined;
    const modelUsed = result.raw?.model_used as string | undefined;

    return (
        <div className="space-y-4 animate-slide-up">
            {/* Distress Assessment */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                    <Stethoscope className="w-5 h-5 text-[#6B48C8]" />
                    <h3 className="text-lg font-bold font-[family-name:var(--font-sans)]">
                        {result.type === "face" ? "Distress Assessment" : "Analysis Results"}
                    </h3>
                </div>
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-3">
                        <span className="text-5xl">{distressInfo.emoji}</span>
                        <div>
                            <p className="text-2xl font-extrabold" style={{ color: distressInfo.color }}>{distressLevel}/10</p>
                            <p className="text-sm font-semibold text-[#4a4b5e]">{distressInfo.label} distress</p>
                        </div>
                    </div>
                    <div className="relative mt-4">
                        <div className="h-4 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #22C55E, #84CC16, #EAB308, #F97316, #EF4444)" }}>
                            <div className="absolute top-0 w-5 h-5 rounded-full bg-white border-gray-800 shadow-lg -translate-x-1/2 -translate-y-[2px]" style={{ left: `${Math.min(distressLevel * 10, 100)}%`, borderWidth: "3px", borderStyle: "solid" }} />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-medium">
                            <span>No pain</span><span>Mild</span><span>Moderate</span><span>Severe</span><span>Worst</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between px-2 mb-2">
                    {DISTRESS_SCALE.map((s, i) => (
                        <div key={i} className={`flex flex-col items-center gap-1 transition-all ${distressLevel >= s.min && distressLevel <= s.max ? "scale-125" : "opacity-50"}`}>
                            <span className="text-2xl">{s.emoji}</span>
                            <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.min === s.max ? s.min : `${s.min}-${s.max}`}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Need Bars */}
            {result.all_needs && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                    <p className="text-sm font-bold text-[#1a1b2e] mb-1 font-[family-name:var(--font-sans)]">
                        {result.type === "face" ? "Face-Based Need Prediction" : "Cry Analysis"}
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                        {result.type === "face" ? "Predicted using facial landmark geometry (NFCS-aligned)" : "Predicted from audio cry patterns using AI"}
                    </p>
                    <div className="space-y-3">
                        {Object.entries(result.all_needs).sort(([, a], [, b]) => b - a).map(([label, score]) => {
                            const pct = Math.round(score * 100);
                            const color = NEED_COLORS[label as NeedLabel] || "#9CA3AF";
                            const emoji = NEED_EMOJI[label as NeedLabel] || "";
                            const isTop = label === result.need_label;
                            return (
                                <div key={label} className={`flex items-center gap-3 ${isTop ? "" : "opacity-75"}`}>
                                    <span className="w-20 text-sm font-semibold text-[#1a1b2e] capitalize flex items-center gap-1.5">{emoji} {label}</span>
                                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                                        <div className="h-full rounded-lg flex items-center transition-all duration-700" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}>
                                            <span className="text-white text-xs font-bold ml-2 whitespace-nowrap drop-shadow-sm">{pct}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Expression */}
            {result.expression && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 text-xl">
                        {getExpressionEmoji(result.expression)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#1a1b2e] capitalize font-[family-name:var(--font-sans)]">
                            Expression: {result.expression}
                        </p>
                        <p className="text-xs text-slate-500">
                            {result.type === "face"
                                ? "Detected from facial landmark geometry"
                                : `Detected by AI facial expression model${result.expression_confidence ? ` (${Math.round(result.expression_confidence * 100)}% confidence)` : ""}`
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Cry Detection Info (audio results) */}
            {result.type === "audio" && cryDetection && (
                <div className={`backdrop-blur-sm border rounded-3xl p-5 flex items-center gap-4 ${
                    cryDetection.is_crying
                        ? "bg-amber-50/70 border-amber-200/40"
                        : "bg-emerald-50/70 border-emerald-200/40"
                }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        cryDetection.is_crying ? "bg-amber-100" : "bg-emerald-100"
                    }`}>
                        <AudioLines className={`w-5 h-5 ${
                            cryDetection.is_crying ? "text-amber-600" : "text-emerald-600"
                        }`} />
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold capitalize font-[family-name:var(--font-sans)] ${
                            cryDetection.is_crying ? "text-amber-900" : "text-emerald-900"
                        }`}>
                            Audio type: {cryDetection.audio_type || "unknown"}
                        </p>
                        <p className={`text-xs ${
                            cryDetection.is_crying ? "text-amber-700" : "text-emerald-700"
                        }`}>
                            Cry confidence: {Math.round((cryDetection.cry_confidence ?? 0) * 100)}%
                            {modelUsed && (
                                <span className="ml-2 opacity-60">· Model: {modelUsed.split("/").pop()}</span>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Facial Action Units (geometric features) */}
            {result.type === "face" && result.stress_features && Object.keys(result.stress_features).length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-[#6B48C8]" />
                        <p className="text-sm font-bold text-[#1a1b2e] font-[family-name:var(--font-sans)]">Facial Action Units (NFCS)</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Geometric feature activations from 468-point face mesh</p>
                    <div className="space-y-2.5">
                        {Object.entries(result.stress_features).sort(([, a], [, b]) => b - a).map(([label, score]) => {
                            const pct = Math.round(score * 100);
                            const getBarColor = (p: number) => {
                                if (p > 60) return "#EF4444"; // Red — high activation
                                if (p > 40) return "#F97316"; // Orange — moderate
                                if (p > 25) return "#EAB308"; // Yellow — mild
                                return "#84CC16"; // Green — low
                            };
                            return (
                                <div key={label} className="flex items-center gap-3">
                                    <span className="w-48 text-xs font-semibold text-[#4a4b5e] truncate">{label}</span>
                                    <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
                                        <div
                                            className="h-full rounded-md transition-all duration-700"
                                            style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: getBarColor(pct) }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 w-10 text-right">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Advice */}
            {advice && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8 border-l-4" style={{ borderLeftColor: distressInfo.color }}>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${distressInfo.color}15` }}>
                            <Lightbulb className="w-5 h-5" style={{ color: distressInfo.color }} />
                        </div>
                        <div>
                            <p className="font-bold text-[#1a1b2e] mb-1 font-[family-name:var(--font-sans)]">{advice.icon} {advice.title}</p>
                            <p className="text-sm text-[#4a4b5e] leading-relaxed">{advice[severity]}</p>
                            {result.secondary_need && (
                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    Also consider: <span className="font-semibold capitalize">{result.secondary_need}</span> — {NEED_ADVICE[result.secondary_need as NeedLabel]?.low || ""}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Playbook Plan CTA */}
            {result.need_label && (result.confidence ?? 0) >= 0.45 && onShowPlaybookPlan && (
                <button
                    onClick={() => onShowPlaybookPlan(result.need_label!, result.confidence ?? 0)}
                    className="w-full bg-gradient-to-r from-[#FFE5E0] to-[#FCECD8] border border-[#F3A595]/30 rounded-3xl p-5 flex items-center gap-4 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 group"
                >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Heart className="w-6 h-6 text-[#F0897A]" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-[#1a1b2e] font-[family-name:var(--font-sans)] mb-0.5">
                            Get Playbook Plan
                        </p>
                        <p className="text-xs text-[#4a4b5e]">
                            Personalised techniques for <span className="font-semibold capitalize">{result.need_label}</span> — ranked by what works
                        </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#F0897A] group-hover:translate-x-1 transition-transform" />
                </button>
            )}

            {/* Boost with audio */}
            {result.type === "face" && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/40 rounded-3xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <Volume2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900 mb-0.5">Boost accuracy with audio</p>
                        <p className="text-xs text-blue-700">Combine face analysis with cry recording for the most accurate need prediction.</p>
                    </div>
                    <button onClick={() => onBoostWithAudio(result.raw)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shrink-0">
                        Record Now
                    </button>
                </div>
            )}

            {/* Fusion weights */}
            {result.fusion_weights && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/40 rounded-3xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                        <Link2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-indigo-900 mb-1">Multimodal Fusion</p>
                        <div className="flex gap-3 text-[11px] font-semibold text-indigo-700">
                            {result.fusion_weights.audio > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100">
                                    <Radio className="w-3 h-3" /> Audio {Math.round((result.fusion_weights.audio as number) * 100)}%
                                </span>
                            )}
                            {result.fusion_weights.face > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100">
                                    <ScanFace className="w-3 h-3" /> Face {Math.round((result.fusion_weights.face as number) * 100)}%
                                </span>
                            )}
                            {result.fusion_weights.context > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100">
                                    <FileStack className="w-3 h-3" /> Context {Math.round((result.fusion_weights.context as number) * 100)}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback + Save */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                {!feedbackGiven ? (
                    <div className="mb-5 pb-5 border-b border-[#EAE2FB]/50">
                        <p className="text-sm font-bold text-[#1a1b2e] mb-3 text-center font-[family-name:var(--font-sans)]">Were we right?</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setFeedbackGiven(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors">
                                <ThumbsUp className="w-4 h-4" /> Yes!
                            </button>
                            <button onClick={() => setFeedbackGiven(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
                                <ThumbsDown className="w-4 h-4" /> Not quite
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-5 pb-5 border-b border-[#EAE2FB]/50 text-center">
                        <p className="text-sm text-slate-500">Thanks for the feedback! This helps Kynari learn.</p>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    {!saved ? (
                        <button onClick={handleSave} disabled={!selectedChild} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                            <Save className="w-4 h-4" /> Save to Timeline
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-[#6B48C8]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-semibold">Saved to timeline!</span>
                        </div>
                    )}
                    {!saved && selectedChild && (
                        <span className="text-xs text-slate-500">Saving for {childrenData?.find(c => c.id === selectedChild)?.name}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
