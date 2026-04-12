"use client";

import { Sparkles, Loader2, Sprout, type LucideIcon } from "lucide-react";

interface MilestoneTypeInfo {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

interface MilestoneFormProps {
    show: boolean;
    creating: boolean;
    milestoneType: string;
    title: string;
    description: string;
    types: MilestoneTypeInfo[];
    onTypeChange: (id: string) => void;
    onTitleChange: (title: string) => void;
    onDescriptionChange: (description: string) => void;
    onCreate: () => void;
}

export function MilestoneForm({
    show,
    creating,
    milestoneType,
    title,
    description,
    types,
    onTypeChange,
    onTitleChange,
    onDescriptionChange,
    onCreate,
}: MilestoneFormProps) {
    if (!show) return null;

    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7BC89D]" />
                <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                    Record a Milestone
                </h2>
            </div>

            {/* Type selector */}
            <div className="flex flex-wrap gap-2">
                {types.map((type) => {
                    const Icon = type.icon;
                    return (
                        <button
                            key={type.id}
                            onClick={() => {
                                onTypeChange(type.id);
                                if (type.id !== "custom") onTitleChange(type.label);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                                milestoneType === type.id
                                    ? "text-white shadow-sm"
                                    : "bg-white/50 border border-white/80 text-slate-500 hover:bg-white/80"
                            }`}
                            style={milestoneType === type.id ? { backgroundColor: type.color } : undefined}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {type.label}
                        </button>
                    );
                })}
            </div>

            <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Milestone title"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#1a1b2e] focus:outline-none focus:ring-2 focus:ring-[#7BC89D]/30 focus:border-[#7BC89D]"
            />

            <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Tell us more about this moment... (optional)"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-[#4a4b5e] resize-none focus:outline-none focus:ring-2 focus:ring-[#7BC89D]/30 focus:border-[#7BC89D]"
            />

            <button
                onClick={onCreate}
                disabled={creating || !title.trim()}
                className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-[#7BC89D] to-[#B5EAC5] text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(123,200,157,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
                Save Milestone
            </button>
        </div>
    );
}
