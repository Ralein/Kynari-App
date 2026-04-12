"use client";

import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import {
    BookOpen,
    Heart,
    Moon,
    Music,
    Sparkles,
    Sprout,
} from "lucide-react";
import { FeatureGrid } from "@/components/soothe/FeatureGrid";

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
    const hasChildren = !!children && children.length > 0;

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
            <FeatureGrid features={FEATURES} hasChildren={hasChildren} />
        </div>
    );
}
