import Link from "next/link";
import { Smartphone, TrendingUp, Sparkles, ArrowRight } from "lucide-react";

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
                                ? "bg-[#EAE2FB] w-8"
                                : "bg-primary-300 w-2.5"
                                }`}
                        />
                    ))}
                </div>

                {/* Celebration */}
                <div className="relative w-28 h-28 mx-auto mb-8">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-mint/30 to-primary-200 flex items-center justify-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden="true">
                            <circle cx="40" cy="35" r="22" fill="#fff1f5" />
                            <ellipse cx="33" cy="30" rx="3.5" ry="2" fill="#1e1b2e" />
                            <ellipse cx="47" cy="30" rx="3.5" ry="2" fill="#1e1b2e" />
                            <path d="M32 40 Q40 50 48 40" stroke="#e879a0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            <circle cx="26" cy="36" r="4" fill="#fda4af" opacity="0.35" />
                            <circle cx="54" cy="36" r="4" fill="#fda4af" opacity="0.35" />
                        </svg>
                    </div>
                    {/* Confetti dots */}
                    <div className="absolute -top-2 -right-1 w-3 h-3 bg-peach rounded-full animate-bounce-gentle" />
                    <div className="absolute -bottom-1 -left-2 w-2.5 h-2.5 bg-primary-400 rounded-full animate-bounce-gentle" style={{ animationDelay: "0.5s" }} />
                    <div className="absolute top-0 -left-4 w-2 h-2 bg-mint rounded-full animate-bounce-gentle" style={{ animationDelay: "1s" }} />
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight mb-3 font-[family-name:var(--font-sans)]">
                    You&apos;re all set!
                </h1>

                <p className="text-[#4a4b5e] text-lg leading-relaxed mb-4">
                    Your child&apos;s profile has been created.
                </p>

                <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto mb-10">
                    Kynari will start learning their emotional baseline once you
                    begin monitoring sessions. After 7 days of data, personalized
                    insights will unlock.
                </p>

                {/* What happens next */}
                <div className="grid gap-3 text-left mb-10 max-w-sm mx-auto">
                    <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                            <Smartphone className="w-4 h-4 text-[#6B48C8]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Connect the app</p>
                            <p className="text-xs text-slate-500">
                                Download the mobile app to start monitoring sessions
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4 text-[#6B48C8]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">7 days to calibrate</p>
                            <p className="text-xs text-slate-500">
                                The baseline engine needs 7 days of data to personalize
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-[#6B48C8]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Then, insights unlock</p>
                            <p className="text-xs text-slate-500">
                                Daily summaries, trend charts, and deviation alerts
                            </p>
                        </div>
                    </div>
                </div>

                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] gap-2 text-base"
                >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
