"use client";

import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import {
    BookOpen,
    ChevronRight,
    Heart,
    Moon,
    Music,
    Sparkles,
    Sprout,
} from "lucide-react";
import { FeatureGrid } from "@/components/playbook/FeatureGrid";

const FEATURES = [
    {
        id: "playbook-plan",
        title: "Soothing Guide",
        description: "Get personalised care techniques ranked by what works for your baby.",
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
        href: "/playbook/soundscape",
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
        href: "/playbook/voice",
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
        href: "/playbook/stories",
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
        href: "/playbook/garden",
        color: "#7BC89D",
        bgFrom: "#D5F5E3",
        bgTo: "#B5EAC5",
        available: true,
    },
];

export default function PlaybookPage() {
    const { data: children } = useChildren();
    const hasChildren = !!children && children.length > 0;

    return (
        <div className="animate-fade-in space-y-6 relative z-10 w-full mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Playbook</span>
            </div>

            {/* Header */}
            <div className="mb-10 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFE5E0] to-[#FCECD8] flex items-center justify-center shadow-sm">
                        <Sparkles className="w-5 h-5 text-[#F0897A]" />
                    </div>
                    <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        The Playbook
                    </h1>
                </div>
                <p className="text-[#4a4b5e] text-sm mt-1">
                    Your personalised care guide and calming toolkit.
                </p>
            </div>

            {/* Feature Grid */}
            <FeatureGrid features={FEATURES} hasChildren={hasChildren} />
        </div>
    );
}
