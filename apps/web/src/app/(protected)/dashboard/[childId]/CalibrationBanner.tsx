"use client";

import { Brain } from "lucide-react";

interface CalibrationBannerProps {
    daysOfData: number;
    daysRemaining: number;
}

export function CalibrationBanner({
    daysOfData,
    daysRemaining,
}: CalibrationBannerProps) {
    const progress = Math.min((daysOfData / 7) * 100, 100);

    return (
        <div className="card-soft p-5 border-primary-200/50 bg-gradient-to-r from-primary-50/60 to-transparent">
            <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary-800 mb-1 font-[family-name:var(--font-sans)]">
                        Learning emotional baseline
                    </h3>
                    <p className="text-sm text-primary-700/70 leading-relaxed mb-3">
                        Kynari needs 7 days of data to understand your child&apos;s
                        unique emotional patterns.{" "}
                        {daysRemaining > 0
                            ? `${daysRemaining} more day${daysRemaining > 1 ? "s" : ""} to go.`
                            : "Almost there!"}
                    </p>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 bg-primary-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-700"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-primary-600 shrink-0">
                            {daysOfData}/7 days
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
