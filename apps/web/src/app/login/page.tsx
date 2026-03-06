import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { BackgroundGradients } from "@/components/ui/BackgroundGradients";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#Fdfbf9] font-[family-name:var(--font-sans)] text-[#1C1C2A] px-4 relative flex-col overflow-hidden">
            <BackgroundGradients />

            <div className="relative w-full max-w-md animate-fade-in z-10 flex flex-col items-center">
                {/* Minimal Header */}
                <div className="text-center justify-center flex flex-col items-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-1 group">
                        <Image src="/logo1.png" alt="Kynari" width={44} height={44} className="rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" priority />
                        <span className="text-[2rem] font-extrabold tracking-tight text-[#1a1b2e] font-[family-name:var(--font-sans)] hover:text-[#6B48C8] transition-colors">
                            kynari
                        </span>
                    </Link>
                    <p className="text-slate-500 font-medium text-sm">
                        Your child&apos;s emotional world
                    </p>
                </div>

                {/* Clerk Sign-In Complete State */}
                <div className="flex justify-center w-full">

                    <SignIn
                        routing="hash"
                        forceRedirectUrl="/welcome"
                        appearance={{
                            variables: {
                                colorPrimary: "#9D76F3", // Make the continue button match the branding purple
                                colorTextOnPrimaryBackground: "#ffffff" // Ensure button text is white
                            },
                            elements: {
                                rootBox: "w-full",
                                card: "shadow-2xl shadow-[#EAE2FB]/50 rounded-[2rem] border border-white/60 bg-white/60 backdrop-blur-xl",
                                formButtonPrimary: "font-semibold text-sm transition-colors shadow-lg shadow-[#9D76F3]/20 rounded-xl py-3",
                                headerTitle: "text-[#1a1b2e] font-bold text-xl font-[family-name:var(--font-sans)]",
                                headerSubtitle: "text-slate-500 font-medium",
                                socialButtonsBlockButton: "border-slate-200 hover:bg-white hover:border-slate-300 rounded-xl bg-white/50 transition-all",
                                socialButtonsBlockButtonText: "text-slate-700 font-semibold",
                                formFieldLabel: "text-slate-700 font-semibold",
                                formFieldInput: "rounded-xl border-slate-200 bg-white/50 focus:bg-white focus:border-[#6B48C8] focus:ring-[#6B48C8] transition-all",
                                footerActionLink: "text-[#6B48C8] hover:text-[#5a3ca8] font-semibold",
                                button: "hover:bg-[#8659DF] transition-colors"
                            },
                        }}
                    />
                </div>

                {/* Footer */}
                <p className="text-center text-xs font-medium text-slate-400 mt-2 pb-4">
                    By signing in, you agree to our <Link href="/privacy" className="text-[#1a1b2e] hover:text-[#6B48C8] transition-colors inline-block ml-1">Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
