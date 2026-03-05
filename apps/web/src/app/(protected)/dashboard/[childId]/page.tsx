"use client";

import { use } from "react";
import Link from "next/link";
import { NEED_EMOJI } from "@kynari/shared";
import {
    useChild,
    useTodaySummary,
    useWeekSummaries,
    useTimeline,
    useBaselineStatus,
} from "@/lib/hooks";
import { EmotionPieChart } from "./EmotionPieChart";
import { WeekTrendChart } from "./WeekTrendChart";
import { HourlyTimeline } from "./HourlyTimeline";
import { CalibrationBanner } from "./CalibrationBanner";
import { ChevronRight, Search, PieChart, TrendingUp, Clock, BarChart3 } from "lucide-react";

export default function ChildReportPage({
    params,
}: {
    params: Promise<{ childId: string }>;
}) {
    const { childId } = use(params);
    const today = new Date().toISOString().split("T")[0];

    const { data: child, isLoading: childLoading } = useChild(childId);
    const { data: summary } = useTodaySummary(childId);
    const { data: weekSummaries } = useWeekSummaries(childId);
    const { data: timeline } = useTimeline(childId, today);
    const { data: baseline } = useBaselineStatus(childId);

    if (childLoading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 h-64 animate-pulse" />
            </div>
        );
    }

    const dominantEmoji = summary?.dominant_need
        ? NEED_EMOJI[summary.dominant_need]
        : null;

    return (
        <div className="animate-fade-in space-y-6 max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Link
                    href="/dashboard"
                    className="hover:text-[#1a1b2e] transition-colors"
                >
                    Dashboard
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">
                    {child?.name ?? "Child Report"}
                </span>
            </div>

            {/* Calibration Banner */}
            {baseline && !baseline.calibration_complete && (
                <CalibrationBanner
                    daysOfData={baseline.days_of_data}
                    daysRemaining={baseline.days_remaining}
                />
            )}

            {/* Analyze CTA */}
            <div className="bg-gradient-to-br from-[#EAE2FB]/60 to-[#FCECD8]/60 border border-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Analyze {child?.name}&apos;s needs
                    </h3>
                    <p className="text-sm text-[#4a4b5e] mt-1">
                        Scan face, record audio, or upload a file
                    </p>
                </div>
                <Link
                    href="/analyze"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] shrink-0 gap-2"
                >
                    <Search className="w-4 h-4" />
                    Analyze Now
                </Link>
            </div>

            {/* Today's Summary Card */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-5 h-5 text-[#F0897A]" />
                    <h2 className="text-xl font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Today&apos;s Summary
                    </h2>
                    <span className="text-xs text-[#6B48C8] px-3 py-1 bg-[#EAE2FB] rounded-full font-medium ml-auto">
                        {today}
                    </span>
                </div>

                {summary ? (
                    <div className="space-y-6">
                        {/* Dominant need + insight */}
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FCECD8] to-[#F1D7B4] flex items-center justify-center shrink-0 shadow-sm">
                                <span className="text-4xl">{dominantEmoji}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-[#F0897A]/10 text-[#F0897A] capitalize">
                                        {summary.dominant_need}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">
                                        Most frequent today
                                    </span>
                                </div>
                                <p className="text-[15px] text-[#4a4b5e] leading-relaxed">
                                    {summary.insight_text}
                                </p>
                            </div>
                        </div>

                        {/* Need distribution bar */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium mb-3">
                                Need distribution ({summary.total_events} readings)
                            </p>
                            <div className="flex rounded-full overflow-hidden h-3.5 mb-2">
                                {Object.entries(summary.need_distribution)
                                    .filter(([, pct]) => pct > 0)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([need, pct]) => {
                                        const NEED_BAR_COLORS: Record<string, string> = {
                                            hungry: "#F3A595", // Peach/orange tint
                                            diaper: "#93E2FA", // Light blue tint
                                            sleepy: "#D4D6DC", // Soft gray/purple tint
                                            pain: "#F0897A", // Stronger red/peach tint
                                            calm: "#B5EAC5", // Mint green tint
                                        };
                                        return (
                                            <div
                                                key={need}
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: NEED_BAR_COLORS[need] ?? "#9CA3AF",
                                                }}
                                                title={`${need}: ${pct}%`}
                                            />
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Baseline deviation indicator */}
                        {summary.baseline_deviation !== null && (
                            <div className="text-xs text-slate-500 font-medium">
                                Baseline deviation:{" "}
                                <span
                                    className={`font-semibold ${Math.abs(summary.baseline_deviation) > 1.5
                                        ? "text-[#F0897A]"
                                        : "text-[#6B48C8]"
                                        }`}
                                >
                                    {summary.baseline_deviation > 0 ? "+" : ""}
                                    {summary.baseline_deviation.toFixed(2)} σ
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#EAE2FB] to-[#FCECD8] flex items-center justify-center mx-auto mb-5 shadow-sm">
                            <BarChart3 className="w-10 h-10 text-[#6B48C8]/60" />
                        </div>
                        <p className="text-[#4a4b5e] text-sm max-w-sm mx-auto">
                            No data recorded today yet. Start a monitoring session to
                            see results here.
                        </p>
                    </div>
                )}
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Need Pie Chart */}
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-[#93E2FA]" />
                        <h3 className="text-lg font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                            Need Breakdown
                        </h3>
                    </div>
                    {summary?.need_distribution ? (
                        <EmotionPieChart
                            distribution={summary.need_distribution}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
                            Awaiting today&apos;s data
                        </div>
                    )}
                </div>

                {/* 7-Day Trend */}
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-[#B5EAC5]" />
                        <h3 className="text-lg font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                            7-Day Trend
                        </h3>
                    </div>
                    <WeekTrendChart summaries={weekSummaries ?? []} />
                </div>
            </div>

            {/* Hourly Timeline */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-[#EAE2FB]" />
                    <h3 className="text-lg font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Today&apos;s Timeline
                    </h3>
                </div>
                <HourlyTimeline groups={timeline ?? []} />
            </div>
        </div>
    );
}
