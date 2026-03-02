"use client";

import { useState } from "react";

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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white">
            <div className="max-w-4xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3">
                        Upgrade to{" "}
                        <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                            Kynari Pro
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Deeper insights into your child&apos;s emotional world
                    </p>
                </div>

                {/* Plan Toggle */}
                <div className="flex items-center justify-center gap-4 mb-10">
                    <button
                        onClick={() => setPlan("monthly")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${plan === "monthly"
                                ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/50"
                                : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setPlan("annual")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${plan === "annual"
                                ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/50"
                                : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Annual{" "}
                        <span className="text-emerald-400 text-xs ml-1">Save 33%</span>
                    </button>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    {/* Free */}
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-slate-200">Free</h3>
                            <div className="mt-2">
                                <span className="text-4xl font-bold">$0</span>
                                <span className="text-slate-400 ml-1">/month</span>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {FEATURES.map((f) => (
                                <li key={f.name} className="flex items-center gap-3 text-sm">
                                    <span
                                        className={
                                            f.free
                                                ? "text-emerald-400"
                                                : "text-slate-600"
                                        }
                                    >
                                        {f.free ? "✓" : "—"}
                                    </span>
                                    <span className={f.free ? "text-slate-300" : "text-slate-500"}>
                                        {f.name}
                                        {typeof f.free === "string" && (
                                            <span className="text-slate-500 ml-1">({f.free})</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <button
                            disabled
                            className="mt-8 w-full py-3 rounded-xl bg-slate-800 text-slate-400 text-sm font-medium cursor-default"
                        >
                            Current Plan
                        </button>
                    </div>

                    {/* Pro */}
                    <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-b from-teal-950/50 to-slate-900/50 backdrop-blur-sm p-8 ring-1 ring-teal-500/20">
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-semibold text-white">Pro</h3>
                                <span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                                    Recommended
                                </span>
                            </div>
                            <div className="mt-2">
                                <span className="text-4xl font-bold">
                                    {plan === "monthly" ? "$4.99" : "$3.33"}
                                </span>
                                <span className="text-slate-400 ml-1">/month</span>
                            </div>
                            {plan === "annual" && (
                                <p className="text-xs text-slate-400 mt-1">
                                    $39.99 billed annually
                                </p>
                            )}
                        </div>
                        <ul className="space-y-3">
                            {FEATURES.map((f) => (
                                <li key={f.name} className="flex items-center gap-3 text-sm">
                                    <span className="text-emerald-400">✓</span>
                                    <span className="text-slate-200">
                                        {f.name}
                                        {typeof f.pro === "string" && (
                                            <span className="text-teal-400 ml-1">({f.pro})</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <button
                            className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25"
                        >
                            Coming Soon
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-500">
                    Cancel anytime. Your data is always yours —{" "}
                    <a href="/privacy" className="text-teal-400 hover:underline">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
}
