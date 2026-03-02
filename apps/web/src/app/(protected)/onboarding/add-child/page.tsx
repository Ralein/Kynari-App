"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createChild } from "@/lib/api";
import { useToken } from "@/lib/hooks";

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
                                    ? "bg-teal-500 w-8"
                                    : step < 2
                                        ? "bg-teal-300 w-2.5"
                                        : "bg-stone-200 w-2.5"
                                }`}
                        />
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center mx-auto mb-8">
                        <span className="text-4xl">👶</span>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight mb-3 font-[family-name:var(--font-sans)]">
                        Add your child
                    </h1>
                    <p className="text-text-secondary text-sm leading-relaxed max-w-sm mx-auto mb-10">
                        Kynari will learn their unique emotional baseline over the first
                        7 days of monitoring.
                    </p>

                    {/* Form Fields */}
                    <div className="space-y-4 text-left mb-8">
                        <div>
                            <label
                                htmlFor="child-name"
                                className="block text-sm font-medium text-text-primary mb-1.5"
                            >
                                Child&apos;s name
                            </label>
                            <input
                                id="child-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Emma"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="child-dob"
                                className="block text-sm font-medium text-text-primary mb-1.5"
                            >
                                Date of birth
                            </label>
                            <input
                                id="child-dob"
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                max={new Date().toISOString().split("T")[0]}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
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
                            className="inline-flex px-8 py-3.5 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Adding…
                                </span>
                            ) : (
                                "Continue →"
                            )}
                        </button>

                        <Link
                            href="/onboarding"
                            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                        >
                            ← Back
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
