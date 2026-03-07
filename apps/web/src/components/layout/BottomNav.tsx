"use client";

import Link from "next/link";
import { LayoutDashboard, Search } from "lucide-react";
import { useChildren } from "@/lib/hooks";

export function BottomNav() {
    const { data: children } = useChildren();
    const hasChildren = children && children.length > 0;

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-white/80 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-around h-14">
                <Link
                    href="/dashboard"
                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[#1a1b2e] transition-colors"
                >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Home</span>
                </Link>
                {hasChildren && (
                    <Link
                        href="/analyze"
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-[#1a1b2e] transition-colors"
                    >
                        <Search className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Analyze</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}
