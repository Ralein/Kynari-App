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
    Footprints,
    Laugh,
    Loader2,
    MessageSquare,
    Smile,
    Star,
} from "lucide-react";
import { MilestoneForm } from "@/components/garden/MilestoneForm";
import { MilestoneGrid } from "@/components/garden/MilestoneGrid";
import { WeeklyNarrative } from "@/components/garden/WeeklyNarrative";

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
            <MilestoneForm 
                show={showAdd} 
                creating={creating} 
                milestoneType={milestoneType} 
                title={title} 
                description={description} 
                types={MILESTONE_TYPES} 
                onTypeChange={setMilestoneType} 
                onTitleChange={setTitle} 
                onDescriptionChange={setDescription} 
                onCreate={handleCreate} 
            />

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#7BC89D]" />
                </div>
            ) : (
                <>
                    <WeeklyNarrative narratives={garden?.narratives || []} />

                    <MilestoneGrid 
                        milestones={garden?.milestones || []} 
                        totalMilestones={garden?.total_milestones || 0} 
                        types={MILESTONE_TYPES} 
                        onDelete={handleDelete} 
                    />
                </>
            )}
        </div>
    );
}
