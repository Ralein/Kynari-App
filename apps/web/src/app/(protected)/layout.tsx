import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-surface">
            {/* ─── Top Navigation ──────────────────────────────── */}
            <header className="sticky top-0 z-50 glass border-b border-stone-200/50">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm font-[family-name:var(--font-sans)]">K</span>
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-teal-800 font-[family-name:var(--font-sans)]">
                            Kynari
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-text-muted hidden sm:block">
                            {user.email}
                        </span>
                        <form action="/auth/signout" method="post">
                            <button
                                type="submit"
                                className="text-sm text-text-muted hover:text-red-500 transition-colors font-medium"
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* ─── Content ─────────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        </div>
    );
}
