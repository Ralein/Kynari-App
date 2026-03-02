import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function LoginPage() {
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

                {/* Clerk Sign-In */}
                <div className="flex justify-center">
                    <SignIn
                        routing="hash"
                        forceRedirectUrl="/dashboard"
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "shadow-xl shadow-stone-900/5 rounded-2xl",
                            },
                        }}
                    />
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
