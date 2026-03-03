"use client";

import { useState } from "react";
import { Check, Minus, Sparkles, Crown } from "lucide-react";

const FEATURES = [
    { name: "Child profiles", free: "1 child", pro: "Unlimited" },
    { name: "Emotion history", free: "7 days", pro: "90 days" },
    { name: "Daily summary", free: true, pro: true },
    { name: "AI weekly narrative", free: false, pro: true },
    { name: "Smart alerts", free: "2 types", pro: "All types" },
    { name: "Data export (JSON)", free: false, pro: true },
    { name: "Priority support", free: false, pro: true },
];

export default function UpgradePage() {
    const [plan, setPlan] = useState<"monthly" | "annual">("annual");

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a0533] via-[#1e1145] to-[#0f1a2e] text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/20 text-sm font-semibold text-primary-300 mb-4">
                        <Crown className="w-3.5 h-3.5" />
                        Premium
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 font-[family-name:var(--font-sans)]">
                        Upgrade to{" "}
                        <span className="bg-gradient-to-r from-primary-400 to-pink-400 bg-clip-text text-transparent">
                            Kynari Pro
                        </span>
                    </h1>
                    <p className="text-white/50 text-base sm:text-lg">
                        Deeper insights into your child&apos;s emotional world
                    </p>
                </div>

                {/* Plan Toggle */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                        <button
                            onClick={() => setPlan("monthly")}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${plan === "monthly"
                                ? "bg-primary-500/20 text-primary-300 shadow-sm"
                                : "text-white/40 hover:text-white/70"
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setPlan("annual")}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${plan === "annual"
                                ? "bg-primary-500/20 text-primary-300 shadow-sm"
                                : "text-white/40 hover:text-white/70"
                                }`}
                        >
                            Annual{" "}
                            <span className="text-mint text-xs ml-1">Save 33%</span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid sm:grid-cols-2 gap-5 mb-12">
                    {/* Free */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white/80">Free</h3>
                            <div className="mt-2">
                                <span className="text-4xl font-extrabold">$0</span>
                                <span className="text-white/40 ml-1">/month</span>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {FEATURES.map((f) => (
                                <li key={f.name} className="flex items-center gap-3 text-sm">
                                    {f.free ? (
                                        <Check className="w-4 h-4 text-mint shrink-0" />
                                    ) : (
                                        <Minus className="w-4 h-4 text-white/20 shrink-0" />
                                    )}
                                    <span className={f.free ? "text-white/70" : "text-white/30"}>
                                        {f.name}
                                        {typeof f.free === "string" && (
                                            <span className="text-white/40 ml-1">({f.free})</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <button
                            disabled
                            className="mt-8 w-full py-3 rounded-xl bg-white/5 text-white/30 text-sm font-semibold cursor-default border border-white/5"
                        >
                            Current Plan
                        </button>
                    </div>

                    {/* Pro */}
                    <div className="rounded-2xl border border-primary-500/25 bg-gradient-to-b from-primary-900/30 to-white/5 backdrop-blur-sm p-6 sm:p-8 ring-1 ring-primary-500/15">
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-white">Pro</h3>
                                <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full font-semibold">
                                    Recommended
                                </span>
                            </div>
                            <div className="mt-2">
                                <span className="text-4xl font-extrabold">
                                    {plan === "monthly" ? "$4.99" : "$3.33"}
                                </span>
                                <span className="text-white/40 ml-1">/month</span>
                            </div>
                            {plan === "annual" && (
                                <p className="text-xs text-white/40 mt-1">
                                    $39.99 billed annually
                                </p>
                            )}
                        </div>
                        <ul className="space-y-3">
                            {FEATURES.map((f) => (
                                <li key={f.name} className="flex items-center gap-3 text-sm">
                                    <Check className="w-4 h-4 text-mint shrink-0" />
                                    <span className="text-white/80">
                                        {f.name}
                                        {typeof f.pro === "string" && (
                                            <span className="text-primary-300 ml-1">({f.pro})</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <button
                            className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-pink-500 text-white text-sm font-bold hover:from-primary-400 hover:to-pink-400 transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Coming Soon
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-white/30">
                    Cancel anytime. Your data is always yours —{" "}
                    <a href="/privacy" className="text-primary-400 hover:underline">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
}
