"use client";

import { Sprout, type LucideIcon } from "lucide-react";
import { MilestoneCard } from "./MilestoneCard";
import { type Milestone } from "@/lib/api";

interface MilestoneTypeInfo {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

interface MilestoneGridProps {
    milestones: Milestone[];
    totalMilestones: number;
    types: MilestoneTypeInfo[];
    onDelete: (id: string) => void;
    deletingIds?: Set<string>;
}

export function MilestoneGrid({
    milestones,
    totalMilestones,
    types,
    onDelete,
    deletingIds = new Set(),
}: MilestoneGridProps) {
    const getMilestoneTypeInfo = (type: string) => {
        const t = types.find((mt) => mt.id === type);
        return t || types[4]; // default to custom
    };

    return (
        <div className="space-y-3">
            <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] flex items-center gap-2">
                <Sprout className="w-4 h-4 text-[#7BC89D]" />
                Milestones
                <span className="text-xs font-normal text-slate-400">
                    ({totalMilestones})
                </span>
            </h2>

            {!milestones?.length ? (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 text-center">
                    <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-[#4a4b5e] font-medium mb-1">No milestones yet</p>
                    <p className="text-sm text-slate-400">
                        Your garden is ready to grow. Add your baby&apos;s first milestone!
                    </p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {milestones.map((milestone) => (
                        <MilestoneCard 
                            key={milestone.id}
                            {...milestone}
                            typeInfo={getMilestoneTypeInfo(milestone.type)}
                            onDelete={onDelete}
                            isDeleting={deletingIds.has(milestone.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

