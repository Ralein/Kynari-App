import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Heart, Star, Cloud } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-surface-warm px-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-primary-200/15 rounded-full blur-3xl" aria-hidden="true" />
            <div className="absolute bottom-10 right-10 w-56 h-56 bg-peach-light/15 rounded-full blur-3xl" aria-hidden="true" />

            {/* Floating decorations */}
            <div className="absolute top-20 right-20 animate-float" aria-hidden="true">
                <Star className="w-5 h-5 text-primary-300/50" />
            </div>
            <div className="absolute bottom-32 left-16 animate-float" style={{ animationDelay: "1s" }} aria-hidden="true">
                <Cloud className="w-6 h-6 text-primary-200/40" />
            </div>
            <div className="absolute top-40 left-[30%] animate-bounce-gentle" aria-hidden="true">
                <Star className="w-3 h-3 text-peach/40" />
            </div>

            <div className="relative w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <Heart className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-primary-800 font-[family-name:var(--font-sans)]">
                            Kynari
                        </span>
                    </Link>
                    <p className="text-text-muted text-sm mt-3">
                        Your child&apos;s emotional world 💜
                    </p>
                </div>

                {/* Clerk Sign-In */}
                <div className="flex justify-center">
                    <SignIn
                        routing="hash"
                        forceRedirectUrl="/dashboard"
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "shadow-xl shadow-primary-900/5 rounded-2xl border border-primary-100/50",
                            },
                        }}
                    />
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-text-muted mt-6">
                    By signing in, you agree to our{" "}
                    <Link href="/privacy" className="text-primary-600 hover:underline">
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    );
}
