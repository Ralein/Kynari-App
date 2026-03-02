"use client";

import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import { ChildCard } from "./ChildCard";

export default function DashboardPage() {
    const { data: children, isLoading } = useChildren();

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-sans)]">
                    {greeting} 👋
                </h1>
                <p className="text-text-secondary mt-1">
                    Here&apos;s how your little ones are doing today.
                </p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="glass rounded-2xl p-6 h-48 animate-pulse"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-stone-200" />
                                <div className="space-y-2">
                                    <div className="w-24 h-4 bg-stone-200 rounded" />
                                    <div className="w-16 h-3 bg-stone-100 rounded" />
                                </div>
                            </div>
                            <div className="w-full h-3 bg-stone-100 rounded mt-8" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!children || children.length === 0) && (
                <div className="glass-dark rounded-2xl p-12 text-center max-w-lg mx-auto mt-16">
                    <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">👶</span>
                    </div>
                    <h2 className="text-xl font-semibold mb-2 font-[family-name:var(--font-sans)]">
                        Add your first child
                    </h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-6">
                        Start by adding a child profile. Kynari will learn their
                        emotional baseline over the first 7 days.
                    </p>
                    <Link
                        href="/onboarding"
                        className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-200 hover:scale-[1.02]"
                    >
                        Get Started
                    </Link>
                </div>
            )}

            {/* Child Cards */}
            {!isLoading && children && children.length > 0 && (
                <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {children.map((child) => (
                            <ChildCard key={child.id} child={child} />
                        ))}

                        {/* Add Another Card */}
                        <Link
                            href="/onboarding/add-child"
                            className="group glass rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[180px] border-2 border-dashed border-stone-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all duration-300"
                        >
                            <div className="w-12 h-12 rounded-full bg-stone-100 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                                <span className="text-2xl text-stone-400 group-hover:text-teal-600 transition-colors">
                                    +
                                </span>
                            </div>
                            <span className="text-sm text-text-muted group-hover:text-teal-600 font-medium transition-colors">
                                Add another child
                            </span>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
