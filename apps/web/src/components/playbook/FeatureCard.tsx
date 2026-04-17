"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface FeatureCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    bgFrom: string;
    bgTo: string;
    available?: boolean;
    isDisabled?: boolean;
}

export function FeatureCard({
    title,
    description,
    icon: Icon,
    href,
    color,
    bgFrom,
    bgTo,
    available = true,
    isDisabled = false,
}: FeatureCardProps) {
    const cardContent = (
        <div
            className={`group relative bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 transition-all duration-300 ${
                isDisabled
                    ? "opacity-60 cursor-default"
                    : "hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer"
            }`}
        >
            {/* Coming Soon Badge */}
            {!available && (
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
                    background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`,
                }}
            >
                <Icon
                    className="w-7 h-7"
                    style={{ color: color }}
                />
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-1.5">
                {title}
            </h3>
            <p className="text-sm text-[#4a4b5e] leading-relaxed mb-4">
                {description}
            </p>

            {/* Arrow */}
            {available && !isDisabled && (
                <div className="flex items-center gap-1 text-sm font-semibold text-[#F0897A] group-hover:gap-2 transition-all duration-200">
                    <span>Open</span>
                    <ChevronRight className="w-4 h-4" />
                </div>
            )}
        </div>
    );

    if (isDisabled) {
        return cardContent;
    }

    return (
        <Link href={href}>
            {cardContent}
        </Link>
    );
}
