"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import type { Child } from "@kynari/shared";
import { NEED_EMOJI, type NeedLabel } from "@kynari/shared";
import { useBaselineStatus, useTodaySummary, useToken } from "@/lib/hooks";
import { deleteChild } from "@/lib/api";
import { Trash2, AlertTriangle } from "lucide-react";

interface ChildCardProps {
    child: Child;
}

function getAge(dob: string): string {
    const birth = new Date(dob);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const totalMonths = years * 12 + months;

    if (totalMonths < 12) return `${totalMonths}mo`;
    if (totalMonths < 24) return `${years}yr ${months >= 0 ? months : 12 + months}mo`;
    return `${years} years`;
}

const AVATAR_GRADIENTS = [
    "from-[#F0897A] to-[#EFA192]",
    "from-[#A2DDF4] to-[#80C9E8]",
    "from-[#F3A595] to-[#EFA192]",
    "from-[#B5EAC5] to-[#98D8AC]",
    "from-[#EAE2FB] to-[#D8CCF7]",
    "from-[#FCECD8] to-[#F1D7B4]",
];

export function ChildCard({ child }: ChildCardProps) {
    const token = useToken();
    const { data: baseline } = useBaselineStatus(child.id);
    const { data: summary } = useTodaySummary(child.id);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const initial = child.name.charAt(0).toUpperCase();
    const age = getAge(child.date_of_birth);
    const calibrationDays = baseline?.days_of_data ?? 0;
    const calibrated = baseline?.calibration_complete ?? false;
    const calibrationPct = Math.min((calibrationDays / 7) * 100, 100);

    // Stable gradient based on first character code
    const gradientIndex = child.name.charCodeAt(0) % AVATAR_GRADIENTS.length;
    const avatarGradient = AVATAR_GRADIENTS[gradientIndex];

    const dominantNeed = summary?.dominant_need as NeedLabel | undefined;
    const dominantEmoji = dominantNeed ? NEED_EMOJI[dominantNeed] : null;

    const handleDelete = async () => {
        if (!token) return;
        setIsDeleting(true);
        try {
            await deleteChild(token, child.id);
            mutate((key: unknown) => Array.isArray(key) && key[0] === "children");
            setShowDeleteConfirm(false);
        } catch {
            setIsDeleting(false);
        }
    };

    return (
        <div className="relative group min-h-[220px]">
            {/* Delete button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                }}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl bg-white/80 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm border border-slate-100 hover:border-red-200"
                title={`Delete ${child.name}`}
            >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 transition-colors" />
            </button>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 border-2 border-red-200 shadow-lg">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-[#1a1b2e] mb-1">Delete {child.name}?</p>
                    <p className="text-xs text-slate-500 text-center mb-4">
                        All analysis data will be permanently removed.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            )}

            <Link
                href={`/dashboard/${child.id}`}
                className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-2xl p-6 flex flex-col h-full hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-shadow duration-300"
            >
                <div className="flex items-center gap-3 mb-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center ${['from-[#EAE2FB] to-[#D8CCF7]', 'from-[#FCECD8] to-[#F1D7B4]'].includes(avatarGradient) ? 'text-[#6B48C8]' : 'text-white'} font-bold text-lg font-[family-name:var(--font-sans)] shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1a1b2e] truncate font-[family-name:var(--font-sans)] text-lg">
                            {child.name}
                        </p>
                        <p className="text-xs text-[#4a4b5e] font-medium">{age}</p>
                    </div>

                    {/* Today's dominant need */}
                    {dominantEmoji && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-2xl group-hover:animate-wiggle">{dominantEmoji}</span>
                        </div>
                    )}
                </div>

                {/* Today's insight */}
                {summary?.insight_text && (
                    <p className="text-sm text-[#4a4b5e] leading-relaxed mb-4 line-clamp-2">
                        {summary.insight_text}
                    </p>
                )}

                {/* Calibration Progress */}
                {!calibrated && (
                    <div className="mt-auto">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                            <span>Calibrating baseline</span>
                            <span>{calibrationDays}/7 days</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] rounded-full transition-all duration-500"
                                style={{ width: `${calibrationPct}%` }}
                            />
                        </div>
                    </div>
                )}

                {calibrated && !summary && (
                    <p className="text-xs text-slate-500 mt-auto flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-[#B5EAC5]" />
                        Baseline calibrated · No data today yet
                    </p>
                )}
            </Link>
        </div>
    );
}
