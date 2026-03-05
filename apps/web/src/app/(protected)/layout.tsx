import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Search } from "lucide-react";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await currentUser();

    if (!user) {
        redirect("/login");
    }

    const email = user.emailAddresses[0]?.emailAddress;

    return (
        <div className="min-h-screen bg-[#Fdfbf9] font-[family-name:var(--font-sans)] text-[#1C1C2A] relative overflow-hidden">
            {/* ─── Background Gradients ────────────────────────────────────── */}
            <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden z-0 fixed">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[70%] rounded-full opacity-60 mix-blend-multiply blur-[100px] bg-[#EAE2FB]" />
                <div className="absolute top-[10%] right-[30%] w-[40%] h-[50%] rounded-full opacity-60 mix-blend-multiply blur-[100px] bg-[#FCECD8]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[60%] rounded-full opacity-50 mix-blend-multiply blur-[100px] bg-[#FFD7D7]" />
                <div className="absolute top-[30%] left-[-10%] w-[40%] h-[50%] rounded-full opacity-40 mix-blend-multiply blur-[100px] bg-[#FCF8DD]" />
            </div>

            {/* ─── Top Navigation ──────────────────────────── */}
            <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-white/80 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Image src="/logo1.png" alt="Kynari" width={32} height={32} className="w-8 h-8 rounded-xl object-cover drop-shadow-sm" priority />
                        <span className="text-lg font-bold tracking-tight text-[#1a1b2e] font-[family-name:var(--font-sans)]">
                            kynari
                        </span>
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

            {/* ─── Content ─────────────────────────────────── */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
                {children}
            </main>

            {/* ─── Mobile Bottom Nav ───────────────────────── */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-white/80 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-around h-14">
                    <Link
                        href="/dashboard"
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[#1a1b2e] transition-colors"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">Home</span>
                    </Link>
                    <Link
                        href="/analyze"
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-[#1a1b2e] transition-colors"
                    >
                        <Search className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Analyze</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
