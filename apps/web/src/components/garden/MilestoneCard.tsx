"use client";

import { Trash2, type LucideIcon } from "lucide-react";

interface MilestoneTypeInfo {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

interface MilestoneCardProps {
    id: string;
    title: string;
    description?: string;
    type: string;
    detected_at?: string;
    caption?: string;
    typeInfo: MilestoneTypeInfo;
    onDelete: (id: string) => void;
}

export function MilestoneCard({
    id,
    title,
    description,
    detected_at,
    caption,
    typeInfo,
    onDelete,
}: MilestoneCardProps) {
    const Icon = typeInfo.icon;

    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5 group hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
            <div className="flex items-start gap-3">
                <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${typeInfo.color}20` }}
                >
                    <Icon className="w-5 h-5" style={{ color: typeInfo.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#1a1b2e] truncate">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-xs text-[#4a4b5e] mt-1 line-clamp-2">
                            {description}
                        </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1.5">
                        {detected_at
                            ? new Date(detected_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })
                            : "Just now"}
                    </p>
                </div>
                <button
                    onClick={() => onDelete(id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
            {caption && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-[#6B48C8] italic">
                        &ldquo;{caption}&rdquo;
                    </p>
                </div>
            )}
        </div>
    );
}
