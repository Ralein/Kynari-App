import Link from "next/link";
import { Mic, Brain, BarChart3, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-lg">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-2.5 rounded-full transition-all ${step === 1
                                ? "bg-primary-500 w-8"
                                : "bg-primary-200"
                                } ${step > 1 ? "w-2.5" : ""}`}
                        />
                    ))}
                </div>

                {/* Welcome Step */}
                <div className="text-center">
                    {/* Cute illustration */}
                    <div className="relative w-28 h-28 mx-auto mb-8">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                            <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden="true">
                                <circle cx="40" cy="35" r="22" fill="#fff1f5" />
                                <ellipse cx="33" cy="32" rx="3" ry="3.5" fill="#1e1b2e" />
                                <ellipse cx="47" cy="32" rx="3" ry="3.5" fill="#1e1b2e" />
                                <circle cx="34.5" cy="30.5" r="1.2" fill="white" />
                                <circle cx="48.5" cy="30.5" r="1.2" fill="white" />
                                <path d="M35 42 Q40 48 45 42" stroke="#e879a0" strokeWidth="2" fill="none" strokeLinecap="round" />
                                <circle cx="27" cy="38" r="4" fill="#fda4af" opacity="0.35" />
                                <circle cx="53" cy="38" r="4" fill="#fda4af" opacity="0.35" />
                            </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-peach flex items-center justify-center animate-bounce-gentle">
                            <span className="text-xs">✨</span>
                        </div>
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight mb-3 font-[family-name:var(--font-sans)]">
                        Welcome to Kynari
                    </h1>

                    <p className="text-text-secondary text-lg leading-relaxed mb-4">
                        Your child&apos;s emotional world, made visible.
                    </p>

                    <p className="text-text-muted text-sm leading-relaxed max-w-sm mx-auto mb-10">
                        Kynari listens for emotional tone — not words. Like a smart baby
                        monitor for feelings. All AI runs on your device.
                    </p>

                    {/* Privacy Assurance Cards */}
                    <div className="grid gap-3 text-left mb-10">
                        <div className="card-soft rounded-xl p-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                                <Mic className="w-4 h-4 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">We listen for tone</p>
                                <p className="text-xs text-text-muted">
                                    Emotional prosody detection — pitch, rhythm, energy
                                </p>
                            </div>
                        </div>
                        <div className="card-soft rounded-xl p-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                                <Brain className="w-4 h-4 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">AI runs on your phone</p>
                                <p className="text-xs text-text-muted">
                                    No audio ever leaves your device. Ever.
                                </p>
                            </div>
                        </div>
                        <div className="card-soft rounded-xl p-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                                <BarChart3 className="w-4 h-4 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Only labels reach us</p>
                                <p className="text-xs text-text-muted">
                                    Tiny data: emotion label + confidence + timestamp
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/onboarding/add-child"
                        className="btn-primary text-base px-8 py-3.5"
                    >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
