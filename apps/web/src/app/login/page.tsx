import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#Fdfbf9] font-[family-name:var(--font-sans)] text-[#1C1C2A] px-4 relative flex-col overflow-hidden">
            {/* ─── Minimal Background ────────────────────────────────────── */}
            <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[70%] rounded-full opacity-40 mix-blend-multiply blur-[120px] bg-[#EAE2FB]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full opacity-30 mix-blend-multiply blur-[120px] bg-[#FCECD8]" />
            </div>

            <div className="relative w-full max-w-md animate-fade-in z-10 flex flex-col items-center">
                {/* Minimal Header */}
                <div className="text-center mb-10 flex flex-col items-center">
                    <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F0897A] to-[#EFA192] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-3xl font-extrabold tracking-tight text-[#1a1b2e] font-[family-name:var(--font-sans)]">
                            kynari
                        </span>
                    </Link>
                    <p className="text-slate-500 font-medium text-sm">
                        Your child&apos;s emotional world
                    </p>
                </div>

                {/* Clerk Sign-In Loading State & Complete State */}
                <div className="flex justify-center w-full min-h-[400px]">
                    <ClerkLoading>
                        <div className="w-full shadow-2xl shadow-[#EAE2FB]/50 rounded-[2rem] border border-white/60 bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center p-10 min-h-[460px] animate-pulse">
                            <div className="relative w-28 h-28 mb-6 rounded-full overflow-hidden bg-white/80 border-2 border-white shadow-sm flex items-center justify-center">
                                <video
                                    src="/load.webm"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover scale-110"
                                />
                            </div>
                            <h3 className="text-lg font-bold text-[#1a1b2e]">
                                Preparing your space...
                            </h3>
                        </div>
                    </ClerkLoading>
                    <ClerkLoaded>
                        <SignIn
                            routing="hash"
                            forceRedirectUrl="/dashboard"
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    card: "shadow-2xl shadow-[#EAE2FB]/50 rounded-[2rem] border border-white/60 bg-white/60 backdrop-blur-xl",
                                    formButtonPrimary: "bg-[#1a1b2e] text-white font-semibold text-sm hover:bg-[#2a2b3e] transition-colors shadow-lg shadow-[#1a1b2e]/20 rounded-xl py-3",
                                    headerTitle: "text-[#1a1b2e] font-bold text-xl font-[family-name:var(--font-sans)]",
                                    headerSubtitle: "text-slate-500 font-medium",
                                    socialButtonsBlockButton: "border-slate-200 hover:bg-white hover:border-slate-300 rounded-xl bg-white/50 transition-all",
                                    socialButtonsBlockButtonText: "text-slate-700 font-semibold",
                                    formFieldLabel: "text-slate-700 font-semibold",
                                    formFieldInput: "rounded-xl border-slate-200 bg-white/50 focus:bg-white focus:border-[#6B48C8] focus:ring-[#6B48C8] transition-all",
                                    footerActionLink: "text-[#6B48C8] hover:text-[#5a3ca8] font-semibold"
                                },
                            }}
                        />
                    </ClerkLoaded>
                </div>

                {/* Footer */}
                <p className="text-center text-xs font-medium text-slate-400 mt-8">
                    By signing in, you agree to our{" "}
                    <Link href="/privacy" className="text-[#1a1b2e] hover:text-[#6B48C8] transition-colors">
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    );
}
