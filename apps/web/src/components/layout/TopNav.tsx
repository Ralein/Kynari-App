import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Search } from "lucide-react";

export function TopNav({ email }: { email?: string }) {
    return (
        <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-white/80 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
                <Link href="/dashboard" className="flex items-center">
                    <Image src="/logo1.png" alt="Kynari" width={56} height={56} className="w-14 h-14 rounded-2xl object-cover drop-shadow-sm" priority />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden sm:flex items-center gap-1">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#1a1b2e] hover:bg-white/50 transition-colors"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Link>
                    <Link
                        href="/analyze"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#1a1b2e] hover:bg-white/50 transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        Analyze
                    </Link>
                </div>

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
