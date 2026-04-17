"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { useChildren } from "@/lib/hooks";
import { Heart, Search } from "lucide-react";
import { usePathname } from "next/navigation";

export function TopNav() {
    const { user } = useUser();
    const { data: children } = useChildren();
    const email = user?.emailAddresses[0]?.emailAddress;
    const pathname = usePathname();
    const hasChildren = !!children && children.length > 0;

    const navLinks = [
        { href: "/dashboard", label: "Home" },
        ...(hasChildren
            ? [
                  { href: "/playbook", label: "Playbook", icon: Heart },
                  { href: "/analyze", label: "Analyze", icon: Search },
              ]
            : []),
    ];

    return (
        <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-white/80 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 grid grid-cols-3 items-center">
                {/* Left — Logo */}
                <div className="flex items-center">
                    <Link href="/dashboard" className="flex items-center">
                        <Image src="/logo1.png" alt="Kynari" width={56} height={56} className="w-14 h-14 rounded-2xl object-cover drop-shadow-sm" priority />
                    </Link>
                </div>

                {/* Center — Nav links */}
                <nav className="hidden sm:flex items-center justify-center gap-1">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        const Icon = "icon" in link ? link.icon : null;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    isActive
                                        ? "bg-[#EAE2FB]/60 text-[#6B48C8]"
                                        : "text-slate-500 hover:text-[#1a1b2e] hover:bg-slate-100/60"
                                }`}
                            >
                                {Icon && <Icon className="w-4 h-4" />}
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right — User controls */}
                <div className="flex items-center justify-end gap-3">
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

