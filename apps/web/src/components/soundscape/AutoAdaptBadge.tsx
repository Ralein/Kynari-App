"use client";

import { Zap } from "lucide-react";

interface AutoAdaptBadgeProps {
    active: boolean;
}

export function AutoAdaptBadge({ active }: AutoAdaptBadgeProps) {
    if (!active) return null;

    return (
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#D5F5E3] text-[#4CAF50]">
            <Zap className="w-3 h-3" />
            Auto-Adapt
        </div>
    );
}
