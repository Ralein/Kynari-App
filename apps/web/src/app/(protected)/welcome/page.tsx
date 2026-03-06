"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 10;

const FOOTPRINTS = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
    isLeft: i % 2 === 0,
    rotate: i % 2 === 0 ? -15 : 15,
    yOffset: i % 2 === 0 ? -14 : 14,
}));

function BabyFoot({ isLeft, rotate, yOffset, visible, index }: {
    isLeft: boolean;
    rotate: number;
    yOffset: number;
    visible: boolean;
    index: number;
}) {
    return (
        <div
            style={{
                opacity: visible ? 1 : 0,
                transform: visible
                    ? `translateY(${yOffset}px) rotate(${rotate}deg) scale(1)`
                    : `translateY(${yOffset + 6}px) rotate(${rotate}deg) scale(0.3)`,
                transition: "opacity 0.35s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                transitionDelay: visible ? `${index * 0.05}s` : "0s",
                filter: "drop-shadow(0 1px 4px rgba(157,118,243,0.4))",
            }}
        >
            <svg
                width={20}
                height={36}
                viewBox="0 0 52 58"
                fill="none"
                style={{ transform: isLeft ? "scaleX(-1)" : "scaleX(1)" }}
            >
                {/* Sole: round heel, left outer edge smooth, right inner edge with clear arch concavity */}
                <path
                    d="M20 55 C10 55 6 47 6 39 C6 29 10 20 17 16 C20 14 24 13 28 13 C34 13 40 17 42 24 C45 31 43 38 39 40 C35 42 31 40 31 37 C31 34 34 29 37 28 C40 27 41 30 40 34 C39 40 35 49 26 53 C24 54 22 55 20 55Z"
                    fill="#C4A8FF"
                />
                {/* Big toe — largest, inner side (left) */}
                <circle cx="11" cy="14" r="6.8" fill="#C4A8FF" />
                {/* 2nd toe */}
                <circle cx="21" cy="10"  r="5.8" fill="#C4A8FF" />
                {/* 3rd toe */}
                <circle cx="31" cy="10"  r="5.0" fill="#C4A8FF" />
                {/* 4th toe — smallest, outer side (right) */}
                <circle cx="40" cy="14" r="4.0" fill="#C4A8FF" />
            </svg>
        </div>
    );
}

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

    const stepsVisible = Math.floor((progress / 100) * TOTAL_STEPS);

    return (
        <div className="flex w-full items-center justify-center animate-fade-in relative z-10 flex-col overflow-hidden min-h-[60vh]">
            <div className="w-full max-w-sm flex items-center justify-center">
                <div className="w-full flex flex-col items-center justify-center p-4 sm:p-10 min-h-[460px]">

                    {/* Video */}
                    <div className="relative w-100 h-100 mb-8 flex items-center justify-center">
                        <video
                            src="/load.webm"
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-contain drop-shadow-xl"
                            ref={(el) => {
                                if (!el) return;
                                el.addEventListener("timeupdate", () => {
                                    if (el.currentTime >= 8) el.currentTime = 5;
                                });
                            }}
                        />
                    </div>

                    <h2 className="text-3xl font-extrabold text-[#1a1b2e] mb-4 text-center tracking-tight">
                        Kynari is loading...
                    </h2>
                    <p className="text-[#4a4b5e] text-center text-base mb-10 max-w-[280px] leading-relaxed">
                        Setting up your emotional dashboard, securely on-device.
                    </p>

                    {/* Footsteps indicator */}
                    <div className="w-full flex flex-col items-center gap-3">

                        {/* Start / % / Ready labels */}
                        <div className="flex items-center justify-between w-full px-1">
                            <span className="text-xs text-[#9D76F3]/60 font-medium">Start</span>
                            <span className="text-xs font-bold text-[#6B48C8]">{Math.round(progress)}%</span>
                            <span className="text-xs text-[#9D76F3]/60 font-medium">Ready!</span>
                        </div>

                        {/* Track + footprints */}
                        <div className="relative w-full h-20 flex items-center">
                            {/* Dotted path */}
                            <div
                                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px"
                                style={{
                                    backgroundImage: "repeating-linear-gradient(90deg, #C4A8FF 0px, #C4A8FF 6px, transparent 6px, transparent 14px)",
                                    opacity: 0.35,
                                }}
                            />
                            {/* Footprints row */}
                            <div className="relative w-full flex items-center justify-between px-1">
                                {FOOTPRINTS.map((fp, i) => (
                                    <BabyFoot
                                        key={i}
                                        index={i}
                                        isLeft={fp.isLeft}
                                        rotate={fp.rotate}
                                        yOffset={fp.yOffset}
                                        visible={i < stepsVisible}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}