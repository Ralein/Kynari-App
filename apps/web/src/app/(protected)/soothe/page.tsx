"use client";

import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import {
    Heart,
    Music,
    BookOpen,
    Moon,
    Sprout,
    ChevronRight,
    Sparkles,
} from "lucide-react";

const FEATURES = [
    {
        id: "soothe-plan",
        title: "Smart Soothe",
        description: "Get personalised soothing techniques ranked by what works for your baby.",
        icon: Heart,
        href: "/analyze",
        color: "#F0897A",
        bgFrom: "#FFE5E0",
        bgTo: "#FCECD8",
        available: true,
    },
    {
        id: "soundscape",
        title: "Sleep Soundscape",
        description: "Adaptive sound mixer — pink noise, nature, and melodies that respond to your baby.",
        icon: Moon,
        href: "/soothe/soundscape",
        color: "#6B48C8",
        bgFrom: "#EAE2FB",
        bgTo: "#D8D0F0",
        available: true,
    },
    {
        id: "voice",
        title: "Voice Lullaby",
        description: "Play classic lullabies with beautiful AI voices. Choose from 20+ voice styles.",
        icon: Music,
        href: "/soothe/voice",
        color: "#93E2FA",
        bgFrom: "#D6F4FF",
        bgTo: "#C2ECFB",
        available: true,
    },
    {
        id: "stories",
        title: "Picture Book",
        description: "Generate personalized illustrated storybooks starring your little one.",
        icon: BookOpen,
        href: "/soothe/stories",
        color: "#F3A595",
        bgFrom: "#FCECD8",
        bgTo: "#FFE5E0",
        available: true,
    },
    {
        id: "garden",
        title: "Memory Garden",
        description: "A living milestone journal that fills itself with your baby's firsts.",
        icon: Sprout,
        href: "/soothe/garden",
        color: "#7BC89D",
        bgFrom: "#D5F5E3",
        bgTo: "#B5EAC5",
        available: true,
    },
];

export default function SoothePage() {
    const { data: children } = useChildren();
    const hasChildren = children && children.length > 0;

    return (
        <div className="animate-fade-in relative z-10 w-full mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-10 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFE5E0] to-[#FCECD8] flex items-center justify-center shadow-sm">
                        <Sparkles className="w-5 h-5 text-[#F0897A]" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Soothe & Comfort
                    </h1>
                </div>
                <p className="text-[#4a4b5e] text-lg mt-1">
                    Tools that help you respond when your baby needs you most.
                </p>
            </div>

            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    const isDisabled = !feature.available || !hasChildren;

                    const card = (
                        <div
                            className={`group relative bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 transition-all duration-300 ${
                                isDisabled
                                    ? "opacity-60 cursor-default"
                                    : "hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer"
                            }`}
                        >
                            {/* Coming Soon Badge */}
                            {!feature.available && (
                                <div className="absolute top-4 right-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
                                        Coming soon
                                    </span>
                                </div>
                            )}

                            {/* Icon */}
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-transform duration-300 group-hover:scale-105"
                                style={{
                                    background: `linear-gradient(135deg, ${feature.bgFrom}, ${feature.bgTo})`,
                                }}
                            >
                                <Icon
                                    className="w-7 h-7"
                                    style={{ color: feature.color }}
                                />
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-1.5">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-[#4a4b5e] leading-relaxed mb-4">
                                {feature.description}
                            </p>

                            {/* Arrow */}
                            {feature.available && (
                                <div className="flex items-center gap-1 text-sm font-semibold text-[#F0897A] group-hover:gap-2 transition-all duration-200">
                                    <span>Open</span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    );

                    if (isDisabled) {
                        return <div key={feature.id}>{card}</div>;
                    }

                    return (
                        <Link key={feature.id} href={feature.href}>
                            {card}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
