import Link from "next/link";
import { Mic, Brain, BarChart3, ArrowRight } from "lucide-react";
import { LuSparkles } from "react-icons/lu";

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
                                ? "bg-[#EAE2FB] w-8"
                                : "bg-primary-200"
                                } ${step > 1 ? "w-2.5" : ""}`}
                        />
                    ))}
                </div>

                {/* Welcome Step */}
                <div className="text-center">
                    {/* Cute illustration */}
                    <div className="relative w-32 h-32 mx-auto mb-8 group">
                        {/* Glow effect behind the circle */}
                        <div className="absolute inset-0 bg-primary-200 rounded-full blur-[20px] opacity-60 group-hover:opacity-100 group-hover:blur-[25px] transition-all duration-700"></div>

                        {/* Video Container */}
                        <div className="relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center border-[5px] border-white ring-[5px] ring-primary-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white transition-all duration-500 ease-out group-hover:scale-105 group-hover:ring-primary-200 z-10">
                            <video
                                src="/video.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                            />
                        </div>

                        {/* Sparkles decoration */}
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-peach flex items-center justify-center shadow-lg shadow-peach/30 backdrop-blur-md z-20 animate-bounce-gentle transition-transform duration-500 group-hover:rotate-12">
                            <LuSparkles className="w-4 h-4 text-white drop-shadow-sm" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight mb-3 font-[family-name:var(--font-sans)]">
                        Welcome to Kynari
                    </h1>

                    <p className="text-[#4a4b5e] text-lg leading-relaxed mb-4">
                        Your child&apos;s emotional world, made visible.
                    </p>

                    <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto mb-10">
                        Kynari listens for emotional tone — not words. Like a smart baby
                        monitor for feelings. All AI runs on your device.
                    </p>

                    {/* Privacy Assurance Cards */}
                    <div className="grid gap-3 text-left mb-10">
                        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <Mic className="w-4 h-4 text-[#6B48C8]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">We listen for tone</p>
                                <p className="text-xs text-slate-500">
                                    Emotional prosody detection — pitch, rhythm, energy
                                </p>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <Brain className="w-4 h-4 text-[#6B48C8]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">AI runs on your device</p>
                                <p className="text-xs text-slate-500">
                                    No audio ever leaves your device. Ever.
                                </p>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <BarChart3 className="w-4 h-4 text-[#6B48C8]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Only labels reach us</p>
                                <p className="text-xs text-slate-500">
                                    Tiny data: emotion label + confidence + timestamp
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/onboarding/add-child"
                        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] gap-2 text-base"
                    >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
