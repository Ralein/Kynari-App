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
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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
        // Prevent double-click: skip if already deleting this milestone
        if (deletingIds.has(milestoneId)) return;

        // Track this deletion
        setDeletingIds((prev) => new Set(prev).add(milestoneId));

        // Optimistic removal — save previous state for rollback
        const prevGarden = garden;
        setGarden((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                milestones: prev.milestones.filter((m) => m.id !== milestoneId),
                total_milestones: prev.total_milestones - 1,
            };
        });

        try {
            const token = await getToken();
            if (!token) throw new Error("No token");
            await deleteMilestone(token, milestoneId, selectedChild);
        } catch {
            // Revert on failure
            setGarden(prevGarden);
        } finally {
            setDeletingIds((prev) => {
                const next = new Set(prev);
                next.delete(milestoneId);
                return next;
            });
        }
    };


    return (
        <div className="animate-fade-in space-y-6 relative z-10 w-full mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/playbook" className="hover:text-[#6B48C8] transition-colors">Playbook</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Memory Garden</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="flex-1">
                    <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e] flex items-center flex-wrap gap-3">
                        Memory Garden
                        {garden !== null && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7BC89D]/10 text-[#59A279] border border-[#7BC89D]/30 shadow-sm animate-fade-in">
                                <Sprout className="w-3.5 h-3.5 mr-1" />
                                {garden.total_milestones} Memories Planted
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-[#4a4b5e] mt-1">
                        A living journal of your baby&apos;s beautiful firsts.
                    </p>
                    
                    {/* Child selector simplified */}
                    {children && children.length > 1 && (
                        <div className="mt-3">
                            <select
                                value={selectedChild}
                                onChange={(e) => setSelectedChild(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-[#1a1b2e] focus:outline-none focus:ring-2 focus:ring-[#7BC89D]/20 shadow-sm"
                            >
                                {children.map((child) => (
                                    <option key={child.id} value={child.id}>{child.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-gradient-to-r from-[#7BC89D] to-[#B5EAC5] text-[#1a1b2e] text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(123,200,157,0.5)] gap-2 self-start sm:self-auto min-w-[160px]"
                >
                    {showAdd ? <Star className="w-4 h-4 text-[#1a1b2e] animate-pulse" /> : <Plus className="w-4 h-4 text-[#1a1b2e]" />}
                    {showAdd ? "Recording Firsts..." : "Add Milestone"}
                </button>
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
                        deletingIds={deletingIds}
                    />
                </>
            )}
        </div>
    );
}
