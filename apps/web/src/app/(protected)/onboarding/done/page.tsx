import Link from "next/link";

export default function OnboardingDonePage() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-lg text-center">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-2.5 rounded-full transition-all ${step === 3
                                    ? "bg-teal-500 w-8"
                                    : "bg-teal-300 w-2.5"
                                }`}
                        />
                    ))}
                </div>

                {/* Celebration */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center mx-auto mb-8">
                    <span className="text-5xl animate-bounce">🎉</span>
                    {/* Decorative dots */}
                    <div className="absolute -top-2 -right-1 w-3 h-3 bg-coral rounded-full animate-ping" />
                    <div className="absolute -bottom-1 -left-2 w-2 h-2 bg-teal-400 rounded-full animate-ping" style={{ animationDelay: "0.5s" }} />
                    <div className="absolute top-0 -left-4 w-2.5 h-2.5 bg-emotion-happy rounded-full animate-ping" style={{ animationDelay: "1s" }} />
                </div>

                <h1 className="text-3xl font-bold tracking-tight mb-3 font-[family-name:var(--font-sans)]">
                    You&apos;re all set!
                </h1>

                <p className="text-text-secondary text-lg leading-relaxed mb-4">
                    Your child&apos;s profile has been created.
                </p>

                <p className="text-text-muted text-sm leading-relaxed max-w-sm mx-auto mb-10">
                    Kynari will start learning their emotional baseline once you
                    begin monitoring sessions. After 7 days of data, personalized
                    insights will unlock.
                </p>

                {/* What happens next */}
                <div className="grid gap-3 text-left mb-10 max-w-sm mx-auto">
                    <div className="glass rounded-xl p-4 flex items-start gap-3">
                        <span className="text-lg">📱</span>
                        <div>
                            <p className="text-sm font-medium">Connect the app</p>
                            <p className="text-xs text-text-muted">
                                Download the mobile app to start monitoring sessions
                            </p>
                        </div>
                    </div>
                    <div className="glass rounded-xl p-4 flex items-start gap-3">
                        <span className="text-lg">📈</span>
                        <div>
                            <p className="text-sm font-medium">7 days to calibrate</p>
                            <p className="text-xs text-text-muted">
                                The baseline engine needs 7 days of data to personalize
                            </p>
                        </div>
                    </div>
                    <div className="glass rounded-xl p-4 flex items-start gap-3">
                        <span className="text-lg">✨</span>
                        <div>
                            <p className="text-sm font-medium">Then, insights unlock</p>
                            <p className="text-xs text-text-muted">
                                Daily summaries, trend charts, and deviation alerts
                            </p>
                        </div>
                    </div>
                </div>

                <Link
                    href="/dashboard"
                    className="inline-flex px-8 py-3.5 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all duration-300 hover:scale-[1.02]"
                >
                    Go to Dashboard →
                </Link>
            </div>
        </div>
    );
}
