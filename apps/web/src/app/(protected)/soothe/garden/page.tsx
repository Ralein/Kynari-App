"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import {
    getMemoryGarden,
    createMilestone,
    deleteMilestone,
    type MemoryGardenData,
} from "@/lib/api";
import {
    Sprout,
    ChevronRight,
    Plus,
    Loader2,
    Trash2,
    Smile,
    Laugh,
    MessageSquare,
    Footprints,
    Star,
    Calendar,
    BookOpen,
    Sparkles,
} from "lucide-react";

const MILESTONE_TYPES = [
    { id: "first_smile", label: "First Smile", icon: Smile, color: "#F0897A" },
    { id: "first_laugh", label: "First Laugh", icon: Laugh, color: "#6B48C8" },
    { id: "first_word", label: "First Word", icon: MessageSquare, color: "#93E2FA" },
    { id: "first_step", label: "First Step", icon: Footprints, color: "#7BC89D" },
    { id: "custom", label: "Custom", icon: Star, color: "#F3A595" },
];

export default function MemoryGardenPage() {
    const { getToken } = useAuth();
    const { data: children } = useChildren();
    const [selectedChild, setSelectedChild] = useState("");
    const [garden, setGarden] = useState<MemoryGardenData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [creating, setCreating] = useState(false);

    // Add form
    const [milestoneType, setMilestoneType] = useState("custom");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (children?.length && !selectedChild) {
            setSelectedChild(children[0].id);
        }
    }, [children, selectedChild]);

    useEffect(() => {
        async function load() {
            if (!selectedChild) return;
            setLoading(true);
            try {
                const token = await getToken();
                if (!token) return;
                const data = await getMemoryGarden(token, selectedChild);
                setGarden(data);
            } catch { /* silent */ }
            finally { setLoading(false); }
        }
        load();
    }, [selectedChild, getToken]);

    const handleCreate = async () => {
        if (!title.trim() || !selectedChild) return;
        setCreating(true);
        try {
            const token = await getToken();
            if (!token) return;
            await createMilestone(token, {
                child_id: selectedChild,
                type: milestoneType,
                title: title.trim(),
                description: description.trim() || undefined,
            });
            // Refresh
            const data = await getMemoryGarden(token, selectedChild);
            setGarden(data);
            setTitle("");
            setDescription("");
            setShowAdd(false);
        } catch { /* silent */ }
        finally { setCreating(false); }
    };

    const handleDelete = async (milestoneId: string) => {
        try {
            const token = await getToken();
            if (!token) return;
            await deleteMilestone(token, milestoneId, selectedChild);
            setGarden((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    milestones: prev.milestones.filter((m) => m.id !== milestoneId),
                    total_milestones: prev.total_milestones - 1,
                };
            });
        } catch { /* silent */ }
    };

    const getMilestoneIcon = (type: string) => {
        const t = MILESTONE_TYPES.find((mt) => mt.id === type);
        return t || MILESTONE_TYPES[4]; // default to custom
    };

    return (
        <div className="animate-fade-in relative z-10 w-full mx-auto max-w-3xl space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Link href="/soothe" className="hover:text-[#1a1b2e] transition-colors">
                    Soothe
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Memory Garden</span>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-br from-[#D5F5E3]/60 to-[#B5EAC5]/30 border border-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <Sprout className="w-6 h-6 text-[#7BC89D]" />
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                                Memory Garden
                            </h1>
                        </div>
                        <p className="text-sm text-[#4a4b5e]">
                            A living journal of your baby&apos;s beautiful firsts.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAdd(!showAdd)}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7BC89D] to-[#B5EAC5] text-white text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(123,200,157,0.5)] flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Milestone
                    </button>
                </div>

                {/* Child selector */}
                {children && children.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-white/40">
                        <select
                            value={selectedChild}
                            onChange={(e) => setSelectedChild(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-white/50 bg-white/50 text-sm font-medium text-[#1a1b2e]"
                        >
                            {children.map((child) => (
                                <option key={child.id} value={child.id}>{child.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Add Milestone Form */}
            {showAdd && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#7BC89D]" />
                        <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                            Record a Milestone
                        </h2>
                    </div>

                    {/* Type selector */}
                    <div className="flex flex-wrap gap-2">
                        {MILESTONE_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        setMilestoneType(type.id);
                                        if (type.id !== "custom") setTitle(type.label);
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
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Milestone title"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#1a1b2e] focus:outline-none focus:ring-2 focus:ring-[#7BC89D]/30 focus:border-[#7BC89D]"
                    />

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us more about this moment... (optional)"
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-[#4a4b5e] resize-none focus:outline-none focus:ring-2 focus:ring-[#7BC89D]/30 focus:border-[#7BC89D]"
                    />

                    <button
                        onClick={handleCreate}
                        disabled={creating || !title.trim()}
                        className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-[#7BC89D] to-[#B5EAC5] text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(123,200,157,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
                        Save Milestone
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#7BC89D]" />
                </div>
            ) : (
                <>
                    {/* Weekly Narratives */}
                    {garden?.narratives && garden.narratives.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-[#6B48C8]" />
                                Weekly Stories
                            </h2>
                            {garden.narratives.map((narrative) => (
                                <div
                                    key={narrative.id}
                                    className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-3.5 h-3.5 text-[#6B48C8]" />
                                        <span className="text-xs font-semibold text-[#6B48C8]">
                                            {narrative.week_start} — {narrative.week_end}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#4a4b5e] leading-relaxed">
                                        {narrative.narrative}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Milestone Grid */}
                    <div className="space-y-3">
                        <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] flex items-center gap-2">
                            <Sprout className="w-4 h-4 text-[#7BC89D]" />
                            Milestones
                            {garden && (
                                <span className="text-xs font-normal text-slate-400">
                                    ({garden.total_milestones})
                                </span>
                            )}
                        </h2>

                        {!garden?.milestones?.length ? (
                            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 text-center">
                                <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-[#4a4b5e] font-medium mb-1">No milestones yet</p>
                                <p className="text-sm text-slate-400">
                                    Your garden is ready to grow. Add your baby&apos;s first milestone!
                                </p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-3">
                                {garden.milestones.map((milestone) => {
                                    const typeInfo = getMilestoneIcon(milestone.type);
                                    const Icon = typeInfo.icon;
                                    return (
                                        <div
                                            key={milestone.id}
                                            className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5 group hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] transition-all duration-300"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: `${typeInfo.color}20` }}
                                                >
                                                    <Icon className="w-5 h-5" style={{ color: typeInfo.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-[#1a1b2e] truncate">
                                                        {milestone.title}
                                                    </h3>
                                                    {milestone.description && (
                                                        <p className="text-xs text-[#4a4b5e] mt-1 line-clamp-2">
                                                            {milestone.description}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-1.5">
                                                        {milestone.detected_at
                                                            ? new Date(milestone.detected_at).toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                                year: "numeric",
                                                            })
                                                            : "Just now"}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(milestone.id)}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            {milestone.caption && (
                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                    <p className="text-xs text-[#6B48C8] italic">
                                                        &ldquo;{milestone.caption}&rdquo;
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
