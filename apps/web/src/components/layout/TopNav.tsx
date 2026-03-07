"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Search } from "lucide-react";
import { useChildren } from "@/lib/hooks";

export function TopNav() {
    const { user } = useUser();
    const { data: children } = useChildren();
    const email = user?.emailAddresses[0]?.emailAddress;
    const hasChildren = children && children.length > 0;

    return (
        <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-white/80 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
                <Link href="/dashboard" className="flex items-center">
                    <Image src="/logo1.png" alt="Kynari" width={56} height={56} className="w-14 h-14 rounded-2xl object-cover drop-shadow-sm" priority />
                </Link>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 hidden md:block truncate max-w-[160px]">
                        {email}
                    </span>
                    <UserButton
                        afterSignOutUrl="/login"
                        appearance={{
                            elements: {
                                avatarBox: "w-8 h-8",
                            },
                        }}
                    />
                </div>
            </div>
        </header>
    );
}
