import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Star, Cloud } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#Fdfbf9] font-[family-name:var(--font-sans)] text-[#1C1C2A] px-4 relative flex-col overflow-hidden">
            {/* ─── Background Gradients ────────────────────────────────────── */}
            <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[70%] rounded-full opacity-60 mix-blend-multiply blur-[100px] bg-[#EAE2FB]" />
                <div className="absolute top-[10%] right-[30%] w-[40%] h-[50%] rounded-full opacity-60 mix-blend-multiply blur-[100px] bg-[#FCECD8]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[60%] rounded-full opacity-50 mix-blend-multiply blur-[100px] bg-[#FFD7D7]" />
                <div className="absolute top-[30%] left-[-10%] w-[40%] h-[50%] rounded-full opacity-40 mix-blend-multiply blur-[100px] bg-[#FCF8DD]" />
            </div>

            {/* Floating decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
                <div className="absolute top-[20%] right-[20%] animate-float">
                    <Star className="w-5 h-5 text-slate-300/50" />
                </div>
                <div className="absolute bottom-[32%] left-[16%] animate-float" style={{ animationDelay: "1s" }}>
                    <Cloud className="w-6 h-6 text-[#EAE2FB]" />
                </div>
                <div className="absolute top-[40%] left-[30%] animate-bounce-gentle">
                    <Star className="w-3 h-3 text-[#FCECD8]" />
                </div>
            </div>

            <div className="relative w-full max-w-md animate-fade-in z-10">
                {/* Logo */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <Link href="/" className="inline-flex items-center gap-2.5">
                        <Image src="/logo1.png" alt="Kynari" width={44} height={44} className="w-11 h-11 rounded-2xl object-cover drop-shadow-sm" priority />
                        <span className="text-2xl font-bold tracking-tight text-[#1a1b2e] font-[family-name:var(--font-sans)]">
                            kynari
                        </span>
                    </Link>
                    <p className="text-slate-500 text-sm mt-3">
                        Your child&apos;s emotional world 
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
                                card: "shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl border border-white/80 bg-white/70 backdrop-blur-md",
                                formButtonPrimary: "bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-[0_4px_14px_0_rgba(240,137,122,0.39)] rounded-full",
                                headerTitle: "text-[#1a1b2e] font-bold font-[family-name:var(--font-sans)]",
                                headerSubtitle: "text-slate-500",
                                socialButtonsBlockButton: "border-slate-200 hover:bg-slate-50 rounded-xl",
                                socialButtonsBlockButtonText: "text-slate-600 font-medium",
                                formFieldLabel: "text-slate-700 font-medium",
                                formFieldInput: "rounded-xl border-slate-200 focus:border-[#F0897A] focus:ring-[#F0897A]",
                                footerActionLink: "text-[#F0897A] hover:text-[#EFA192] font-medium"
                            },
                        }}
                    />
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 mt-6">
                    By signing in, you agree to our{" "}
                    <Link href="/privacy" className="text-[#1a1b2e] hover:underline hover:text-slate-600">
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    );
}
