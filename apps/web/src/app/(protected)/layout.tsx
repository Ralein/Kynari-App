import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Heart, LayoutDashboard, Search, Sparkles } from "lucide-react";

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
        <div className="min-h-screen bg-surface">
            {/* ─── Top Navigation ──────────────────────────── */}
            <header className="sticky top-0 z-50 glass border-b border-primary-100/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                            <Heart className="w-4 h-4 text-white fill-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-primary-800 font-[family-name:var(--font-sans)]">
                            Kynari
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden sm:flex items-center gap-1">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-primary-700 hover:bg-primary-50 transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <Link
                            href="/analyze"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-primary-700 hover:bg-primary-50 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            Analyze
                        </Link>
                        <Link
                            href="/upgrade"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-primary-700 hover:bg-primary-50 transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Upgrade
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted hidden md:block truncate max-w-[160px]">
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
                {children}
            </main>

            {/* ─── Mobile Bottom Nav ───────────────────────── */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-primary-100/40 px-2 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around h-14">
                    <Link
                        href="/dashboard"
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-primary-600 transition-colors"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">Home</span>
                    </Link>
                    <Link
                        href="/analyze"
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-text-muted hover:text-primary-600 transition-colors"
                    >
                        <Search className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Analyze</span>
                    </Link>
                    <Link
                        href="/upgrade"
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-text-muted hover:text-primary-600 transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Pro</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
