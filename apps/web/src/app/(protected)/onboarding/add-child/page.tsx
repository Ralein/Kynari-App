"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createChild } from "@/lib/api";
import { useToken } from "@/lib/hooks";
import { Baby, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

export default function AddChildPage() {
    const router = useRouter();
    const token = useToken();
    const [name, setName] = useState("");
    const [dob, setDob] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = name.trim().length > 0 && dob.length > 0 && !loading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!token || !canSubmit) return;

        setLoading(true);
        setError(null);

        try {
            await createChild(token, {
                name: name.trim(),
                date_of_birth: dob,
            });
            router.push("/onboarding/done");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-lg">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-2.5 rounded-full transition-all ${step === 2
                                ? "bg-[#EAE2FB] w-8"
                                : step < 2
                                    ? "bg-primary-300 w-2.5"
                                    : "bg-primary-200 w-2.5"
                                }`}
                        />
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-8">
                        <Baby className="w-10 h-10 text-[#6B48C8]" />
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight mb-3 font-[family-name:var(--font-sans)]">
                        Add your child
                    </h1>
                    <p className="text-[#4a4b5e] text-sm leading-relaxed max-w-sm mx-auto mb-10">
                        Kynari will learn their unique emotional baseline over the first
                        7 days of monitoring.
                    </p>

                    {/* Form Fields */}
                    <div className="space-y-4 text-left mb-8">
                        <div>
                            <label
                                htmlFor="child-name"
                                className="block text-sm font-semibold text-[#1a1b2e] mb-1.5"
                            >
                                Child&apos;s name
                            </label>
                            <input
                                id="child-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Emma"
                                className="w-full px-4 py-3 rounded-xl border border-[#EAE2FB] bg-white text-[#1a1b2e] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6B48C8]/30 focus:border-[#6B48C8] transition-all"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="child-dob"
                                className="block text-sm font-semibold text-[#1a1b2e] mb-1.5"
                            >
                                Date of birth
                            </label>
                            <input
                                id="child-dob"
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                max={new Date().toISOString().split("T")[0]}
                                className="w-full px-4 py-3 rounded-xl border border-[#EAE2FB] bg-white text-[#1a1b2e] focus:outline-none focus:ring-2 focus:ring-[#6B48C8]/30 focus:border-[#6B48C8] transition-all"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-3">
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] gap-2 text-base disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding…
                                </span>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <Link
                            href="/onboarding"
                            className="text-sm text-slate-500 hover:text-[#4a4b5e] transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
