"use client";

import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import { ChildCard } from "./ChildCard";
import { Search, Baby, Plus, Sun, Moon, CloudSun } from "lucide-react";

export default function DashboardPage() {
    const { data: children, isLoading } = useChildren();

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const GreetingIcon = hour < 12 ? Sun : hour < 17 ? CloudSun : Moon;

    return (
        <div className="animate-fade-in relative z-10 w-full mx-auto">
            {/* Header */}
            <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <GreetingIcon className="w-6 h-6 text-[#F0897A]" />
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                            {greeting} 
                        </h1>
                    </div>
                    <p className="text-[#4a4b5e] text-lg">
                        Here&apos;s how your little ones are doing today.
                    </p>
                </div>
                
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-2xl p-6 h-48"
                        >
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 rounded-full bg-[#EAE2FB]/60 animate-pulse" />
                                <div className="space-y-3 flex-1">
                                    <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
                                    <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded mt-8 animate-pulse" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!children || children.length === 0) && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-12 text-center max-w-lg mx-auto md:mt-12 mt-6">
                    <div className="relative w-24 h-24 mx-auto mb-6 group">
                        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-[#EAE2FB] to-[#FCECD8] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                            <Baby className="w-10 h-10 text-[#6B48C8]" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#F0897A] border-4 border-[#Fdfbf9] flex items-center justify-center animate-bounce-gentle">
                            <Plus className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-3 font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        Add your first child
                    </h2>
                    <p className="text-[#4a4b5e] leading-relaxed mb-8">
                        Start by adding a child profile. Kynari will learn their
                        emotional baseline over the first 7 days.
                    </p>
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)]"
                    >
                        Get Started
                    </Link>
                </div>
            )}

            {/* Child Cards */}
            {!isLoading && children && children.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {children.map((child) => (
                        <div key={child.id} className="relative">
                            <ChildCard child={child} />
                        </div>
                    ))}

                    {/* Add Another Card */}
                    <Link
                        href="/onboarding/add-child"
                        className="group bg-white/40 backdrop-blur-sm border-2 border-dashed border-slate-200 hover:border-[#A2DDF4] hover:bg-white/60 shadow-sm rounded-2xl p-6 flex flex-col items-center justify-center gap-4 min-h-[220px] transition-all duration-300"
                    >
                        <div className="w-14 h-14 rounded-full bg-slate-100 group-hover:bg-[#A2DDF4]/20 flex items-center justify-center transition-colors duration-300">
                            <Plus className="w-6 h-6 text-slate-400 group-hover:text-[#6B48C8] transition-colors" />
                        </div>
                        <span className="text-sm text-slate-500 group-hover:text-[#1a1b2e] font-semibold transition-colors">
                            Add another child
                        </span>
                    </Link>
                </div>
            )}
        </div>
    );
}
