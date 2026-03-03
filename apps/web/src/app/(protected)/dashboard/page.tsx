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
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                    <GreetingIcon className="w-5 h-5 text-peach" />
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-[family-name:var(--font-sans)]">
                        {greeting} 👋
                    </h1>
                </div>
                <p className="text-text-secondary mt-1">
                    Here&apos;s how your little ones are doing today.
                </p>
                <div className="mt-4">
                    <Link
                        href="/analyze"
                        className="btn-primary"
                    >
                        <Search className="w-4 h-4" />
                        Analyze Baby Emotion
                    </Link>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="card-soft p-6 h-48"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-primary-100 animate-pulse" />
                                <div className="space-y-2">
                                    <div className="w-24 h-4 bg-primary-100 rounded animate-pulse" />
                                    <div className="w-16 h-3 bg-primary-50 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="w-full h-3 bg-primary-50 rounded mt-8 animate-pulse" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!children || children.length === 0) && (
                <div className="card-soft p-12 text-center max-w-lg mx-auto mt-12">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                            <Baby className="w-10 h-10 text-primary-500" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-peach flex items-center justify-center animate-bounce-gentle">
                            <Plus className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold mb-2 font-[family-name:var(--font-sans)]">
                        Add your first child
                    </h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-6">
                        Start by adding a child profile. Kynari will learn their
                        emotional baseline over the first 7 days.
                    </p>
                    <Link
                        href="/onboarding"
                        className="btn-primary"
                    >
                        Get Started
                    </Link>
                </div>
            )}

            {/* Child Cards */}
            {!isLoading && children && children.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {children.map((child) => (
                        <ChildCard key={child.id} child={child} />
                    ))}

                    {/* Add Another Card */}
                    <Link
                        href="/onboarding/add-child"
                        className="group card-soft p-6 flex flex-col items-center justify-center gap-3 min-h-[180px] border-2 border-dashed border-primary-200/60 hover:border-primary-400 hover:bg-primary-50/30 transition-all duration-300"
                    >
                        <div className="w-12 h-12 rounded-full bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                            <Plus className="w-5 h-5 text-primary-400 group-hover:text-primary-600 transition-colors" />
                        </div>
                        <span className="text-sm text-text-muted group-hover:text-primary-600 font-semibold transition-colors">
                            Add another child
                        </span>
                    </Link>
                </div>
            )}
        </div>
    );
}
