"use client";

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
        <div className="glass rounded-2xl p-6 border border-teal-100/50 bg-gradient-to-r from-teal-50/50 to-transparent">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl">🧠</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-teal-800 mb-1 font-[family-name:var(--font-sans)]">
                        Learning emotional baseline
                    </h3>
                    <p className="text-sm text-teal-700/80 leading-relaxed mb-3">
                        Kynari needs 7 days of data to understand your child&apos;s
                        unique emotional patterns.{" "}
                        {daysRemaining > 0
                            ? `${daysRemaining} more day${daysRemaining > 1 ? "s" : ""} to go.`
                            : "Almost there!"}
                    </p>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-teal-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-700"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-teal-600 shrink-0">
                            {daysOfData}/7 days
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
