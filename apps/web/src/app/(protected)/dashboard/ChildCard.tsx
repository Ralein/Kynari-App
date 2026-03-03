"use client";

import Link from "next/link";
import type { Child } from "@kynari/shared";
import { EMOTION_EMOJI } from "@kynari/shared";
import { useBaselineStatus, useTodaySummary } from "@/lib/hooks";

interface ChildCardProps {
    child: Child;
}

function getAge(dob: string): string {
    const birth = new Date(dob);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const totalMonths = years * 12 + months;

    if (totalMonths < 12) return `${totalMonths}mo`;
    if (totalMonths < 24) return `${years}yr ${months >= 0 ? months : 12 + months}mo`;
    return `${years} years`;
}

const AVATAR_GRADIENTS = [
    "from-primary-400 to-primary-500",
    "from-pink-400 to-rose-500",
    "from-violet-400 to-purple-500",
    "from-blue-400 to-indigo-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
];

export function ChildCard({ child }: ChildCardProps) {
    const { data: baseline } = useBaselineStatus(child.id);
    const { data: summary } = useTodaySummary(child.id);

    const initial = child.name.charAt(0).toUpperCase();
    const age = getAge(child.date_of_birth);
    const calibrationDays = baseline?.days_of_data ?? 0;
    const calibrated = baseline?.calibration_complete ?? false;
    const calibrationPct = Math.min((calibrationDays / 7) * 100, 100);

    // Stable gradient based on first character code
    const gradientIndex = child.name.charCodeAt(0) % AVATAR_GRADIENTS.length;
    const avatarGradient = AVATAR_GRADIENTS[gradientIndex];

    const dominantEmoji = summary?.dominant_emotion
        ? EMOTION_EMOJI[summary.dominant_emotion]
        : null;

    return (
        <Link
            href={`/dashboard/${child.id}`}
            className="group card-soft p-6"
        >
            <div className="flex items-center gap-3 mb-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-lg font-[family-name:var(--font-sans)] shadow-md shadow-primary-500/15 group-hover:scale-105 transition-transform duration-300`}>
                    {initial}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary truncate font-[family-name:var(--font-sans)]">
                        {child.name}
                    </p>
                    <p className="text-xs text-text-muted">{age}</p>
                </div>

                {/* Today's dominant emotion */}
                {dominantEmoji && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-2xl group-hover:animate-wiggle">{dominantEmoji}</span>
                    </div>
                )}
            </div>

            {/* Today's insight */}
            {summary?.insight_text && (
                <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
                    {summary.insight_text}
                </p>
            )}

            {/* Emotion distribution bar */}
            {summary?.emotion_distribution && (
                <div className="flex rounded-full overflow-hidden h-2.5 mb-4">
                    {Object.entries(summary.emotion_distribution)
                        .filter(([, pct]) => pct > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([emotion, pct]) => (
                            <div
                                key={emotion}
                                className={`bg-emotion-${emotion}`}
                                style={{ width: `${pct}%` }}
                            />
                        ))}
                </div>
            )}

            {/* Calibration Progress */}
            {!calibrated && (
                <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                        <span>Calibrating baseline</span>
                        <span>{calibrationDays}/7 days</span>
                    </div>
                    <div className="w-full h-2 bg-primary-50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                            style={{ width: `${calibrationPct}%` }}
                        />
                    </div>
                </div>
            )}

            {calibrated && !summary && (
                <p className="text-xs text-text-muted mt-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-mint-dark" />
                    Baseline calibrated · No data today yet
                </p>
            )}
        </Link>
    );
}
