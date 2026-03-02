"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const supabase = createClient();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setSent(true);
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-stone-50 px-4">
            {/* Background orbs */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-56 h-56 bg-coral/10 rounded-full blur-3xl" />

            <div className="relative w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <span className="text-white font-semibold text-xl font-[family-name:var(--font-sans)]">K</span>
                        </div>
                        <span className="text-2xl font-semibold tracking-tight text-teal-800 font-[family-name:var(--font-sans)]">
                            Kynari
                        </span>
                    </Link>
                </div>

                {/* Card */}
                <div className="glass rounded-2xl p-8 shadow-xl shadow-stone-900/5">
                    {sent ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">✉️</span>
                            </div>
                            <h2 className="text-xl font-semibold mb-2 font-[family-name:var(--font-sans)]">
                                Check your email
                            </h2>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                We&apos;ve sent a magic link to{" "}
                                <span className="font-medium text-teal-700">{email}</span>.
                                Click the link to sign in.
                            </p>
                            <button
                                onClick={() => setSent(false)}
                                className="mt-6 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
                            >
                                Use a different email
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-semibold text-center mb-2 font-[family-name:var(--font-sans)]">
                                Welcome back
                            </h2>
                            <p className="text-text-secondary text-sm text-center mb-8">
                                Sign in with a magic link — no password needed.
                            </p>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-text-primary mb-1.5"
                                    >
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-text-muted"
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.01]"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending link...
                                        </span>
                                    ) : (
                                        "Send magic link"
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-text-muted mt-6">
                    By signing in, you agree to our{" "}
                    <Link href="/privacy" className="text-teal-600 hover:underline">
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    );
}
