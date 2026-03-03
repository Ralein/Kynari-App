"use client";

import { use } from "react";
import Link from "next/link";
import { EMOTION_EMOJI } from "@kynari/shared";
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
                <div className="h-8 w-48 bg-primary-100 rounded-lg animate-pulse" />
                <div className="card-soft p-8 h-64 animate-pulse" />
            </div>
        );
    }

    const dominantEmoji = summary?.dominant_emotion
        ? EMOTION_EMOJI[summary.dominant_emotion]
        : null;

    return (
        <div className="animate-fade-in space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
                <Link
                    href="/dashboard"
                    className="hover:text-primary-600 transition-colors"
                >
                    Dashboard
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-text-primary font-semibold">
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
            <div className="card-soft p-5 flex items-center justify-between">
                <div>
                    <h3 className="font-bold font-[family-name:var(--font-sans)]">
                        Analyze {child?.name}&apos;s emotions
                    </h3>
                    <p className="text-sm text-text-muted mt-0.5">
                        Scan face, record audio, or upload a file
                    </p>
                </div>
                <Link
                    href="/analyze"
                    className="btn-primary shrink-0"
                >
                    <Search className="w-4 h-4" />
                    Analyze Now
                </Link>
            </div>

            {/* Today's Summary Card */}
            <div className="card-soft p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                    <BarChart3 className="w-4.5 h-4.5 text-primary-500" />
                    <h2 className="text-lg font-bold font-[family-name:var(--font-sans)]">
                        Today&apos;s Summary
                    </h2>
                    <span className="text-xs text-text-muted px-2 py-0.5 bg-primary-50 rounded-full ml-auto">
                        {today}
                    </span>
                </div>

                {summary ? (
                    <div className="space-y-5">
                        {/* Dominant emotion + insight */}
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0">
                                <span className="text-3xl">{dominantEmoji}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold bg-emotion-${summary.dominant_emotion}/20`}
                                    >
                                        {summary.dominant_emotion}
                                    </span>
                                    <span className="text-xs text-text-muted">
                                        Dominant today
                                    </span>
                                </div>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    {summary.insight_text}
                                </p>
                            </div>
                        </div>

                        {/* Emotion distribution bar */}
                        <div>
                            <p className="text-xs text-text-muted mb-2">
                                Emotion distribution ({summary.total_events} readings)
                            </p>
                            <div className="flex rounded-full overflow-hidden h-3">
                                {Object.entries(summary.emotion_distribution)
                                    .filter(([, pct]) => pct > 0)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([emotion, pct]) => (
                                        <div
                                            key={emotion}
                                            className={`bg-emotion-${emotion}`}
                                            style={{ width: `${pct}%` }}
                                            title={`${emotion}: ${pct}%`}
                                        />
                                    ))}
                            </div>
                        </div>

                        {/* Baseline deviation indicator */}
                        {summary.baseline_deviation !== null && (
                            <div className="text-xs text-text-muted">
                                Baseline deviation:{" "}
                                <span
                                    className={`font-semibold ${Math.abs(summary.baseline_deviation) > 1.5
                                        ? "text-blush"
                                        : "text-primary-600"
                                        }`}
                                >
                                    {summary.baseline_deviation > 0 ? "+" : ""}
                                    {summary.baseline_deviation.toFixed(2)} σ
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-8 h-8 text-primary-300" />
                        </div>
                        <p className="text-text-secondary text-sm">
                            No data recorded today yet. Start a monitoring session to
                            see results here.
                        </p>
                    </div>
                )}
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-5">
                {/* Emotion Pie Chart */}
                <div className="card-soft p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart className="w-4 h-4 text-primary-500" />
                        <h3 className="text-base font-bold font-[family-name:var(--font-sans)]">
                            Emotion Breakdown
                        </h3>
                    </div>
                    {summary?.emotion_distribution ? (
                        <EmotionPieChart
                            distribution={summary.emotion_distribution}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-48 text-text-muted text-sm">
                            Awaiting today&apos;s data
                        </div>
                    )}
                </div>

                {/* 7-Day Trend */}
                <div className="card-soft p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-primary-500" />
                        <h3 className="text-base font-bold font-[family-name:var(--font-sans)]">
                            7-Day Trend
                        </h3>
                    </div>
                    <WeekTrendChart summaries={weekSummaries ?? []} />
                </div>
            </div>

            {/* Hourly Timeline */}
            <div className="card-soft p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-primary-500" />
                    <h3 className="text-base font-bold font-[family-name:var(--font-sans)]">
                        Today&apos;s Timeline
                    </h3>
                </div>
                <HourlyTimeline groups={timeline ?? []} />
            </div>
        </div>
    );
}
