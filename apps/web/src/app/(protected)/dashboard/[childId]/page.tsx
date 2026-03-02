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
                <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
                <div className="glass rounded-2xl p-8 h-64 animate-pulse" />
            </div>
        );
    }

    const dominantEmoji = summary?.dominant_emotion
        ? EMOTION_EMOJI[summary.dominant_emotion]
        : null;

    return (
        <div className="animate-fade-in space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-text-muted">
                <Link
                    href="/dashboard"
                    className="hover:text-teal-600 transition-colors"
                >
                    Dashboard
                </Link>
                <span>/</span>
                <span className="text-text-primary font-medium">
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
            <div className="glass rounded-2xl p-6 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold font-[family-name:var(--font-sans)]">
                        Analyze {child?.name}&apos;s emotions
                    </h3>
                    <p className="text-sm text-text-muted mt-0.5">
                        Scan face, record audio, or upload a file
                    </p>
                </div>
                <Link
                    href="/analyze"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-200 hover:scale-[1.02] shrink-0"
                >
                    <span>🔍</span>
                    Analyze Now
                </Link>
            </div>

            {/* Today's Summary Card */}
            <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold font-[family-name:var(--font-sans)]">
                        Today&apos;s Summary
                    </h2>
                    <span className="text-xs text-text-muted px-2 py-0.5 bg-stone-100 rounded-full">
                        {today}
                    </span>
                </div>

                {summary ? (
                    <div className="space-y-6">
                        {/* Dominant emotion + insight */}
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center shrink-0">
                                <span className="text-3xl">{dominantEmoji}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium bg-emotion-${summary.dominant_emotion}/15`}
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
                                    className={`font-medium ${Math.abs(summary.baseline_deviation) > 1.5
                                        ? "text-coral"
                                        : "text-teal-600"
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
                        <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">📊</span>
                        </div>
                        <p className="text-text-secondary text-sm">
                            No data recorded today yet. Start a monitoring session to
                            see results here.
                        </p>
                    </div>
                )}
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Emotion Pie Chart */}
                <div className="glass rounded-2xl p-8">
                    <h3 className="text-lg font-semibold mb-4 font-[family-name:var(--font-sans)]">
                        Emotion Breakdown
                    </h3>
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
                <div className="glass rounded-2xl p-8">
                    <h3 className="text-lg font-semibold mb-4 font-[family-name:var(--font-sans)]">
                        7-Day Trend
                    </h3>
                    <WeekTrendChart summaries={weekSummaries ?? []} />
                </div>
            </div>

            {/* Hourly Timeline */}
            <div className="glass rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-4 font-[family-name:var(--font-sans)]">
                    Today&apos;s Timeline
                </h3>
                <HourlyTimeline groups={timeline ?? []} />
            </div>
        </div>
    );
}
