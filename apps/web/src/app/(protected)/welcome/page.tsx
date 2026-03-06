"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackgroundGradients } from "@/components/ui/BackgroundGradients";

export default function WelcomeLoadingPage() {
    const router = useRouter();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const duration = 8000;
        const interval = 50;
        let elapsed = 0;

        const timer = setInterval(() => {
            elapsed += interval;
            setProgress(Math.min((elapsed / duration) * 100, 100));
        }, interval);

        const redirect = setTimeout(() => {
            router.push("/dashboard");
        }, duration);

        return () => {
            clearInterval(timer);
            clearTimeout(redirect);
        };
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#Fdfbf9] font-[family-name:var(--font-sans)] text-[#1C1C2A] px-4 relative flex-col overflow-hidden">
            <BackgroundGradients />
            <div className="relative w-full max-w-md animate-fade-in z-10 flex flex-col items-center">
                <div className="w-full shadow-2xl shadow-[#EAE2FB]/50 rounded-[2rem] border border-white/60 bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center p-10 min-h-[460px]">
                    <div className="relative w-28 h-28 mb-8 rounded-full overflow-hidden bg-white/80 border-2 border-white shadow-sm flex items-center justify-center">
                        <video
                            src="/load.webm"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover scale-110"
                        />
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#1a1b2e] mb-3 text-center">
                        Kynari is loading...
                    </h2>
                    <p className="text-[#4a4b5e] text-center text-sm mb-8 max-w-[250px] leading-relaxed">
                        Setting up your emotional dashboard, securely on-device.
                    </p>

                    <div className="w-full bg-slate-200/50 rounded-full h-1.5 mb-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-[#6B48C8] to-[#9D76F3] h-1.5 rounded-full transition-all duration-75 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 font-medium animate-pulse">
                        Please wait a moment
                    </p>
                </div>
            </div>
        </div>
    );
}
