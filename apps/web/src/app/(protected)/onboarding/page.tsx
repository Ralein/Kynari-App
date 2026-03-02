import Link from "next/link";

export default function OnboardingPage() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-lg">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${step === 1
                                    ? "bg-teal-500 w-8"
                                    : "bg-stone-200"
                                }`}
                        />
                    ))}
                </div>

                {/* Welcome Step */}
                <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center mx-auto mb-8">
                        <span className="text-5xl">🧒</span>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight mb-3 font-[family-name:var(--font-sans)]">
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
                        <div className="glass rounded-xl p-4 flex items-start gap-3">
                            <span className="text-xl">🎤</span>
                            <div>
                                <p className="text-sm font-medium">We listen for tone</p>
                                <p className="text-xs text-text-muted">
                                    Emotional prosody detection — pitch, rhythm, energy
                                </p>
                            </div>
                        </div>
                        <div className="glass rounded-xl p-4 flex items-start gap-3">
                            <span className="text-xl">🧠</span>
                            <div>
                                <p className="text-sm font-medium">AI runs on your phone</p>
                                <p className="text-xs text-text-muted">
                                    No audio ever leaves your device. Ever.
                                </p>
                            </div>
                        </div>
                        <div className="glass rounded-xl p-4 flex items-start gap-3">
                            <span className="text-xl">📊</span>
                            <div>
                                <p className="text-sm font-medium">Only labels reach us</p>
                                <p className="text-xs text-text-muted">
                                    Tiny data: emotion label + confidence + timestamp
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/onboarding/add-child"
                        className="inline-flex px-8 py-3.5 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all duration-300 hover:scale-[1.02]"
                    >
                        Continue →
                    </Link>
                </div>
            </div>
        </div>
    );
}
