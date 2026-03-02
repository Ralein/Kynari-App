import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

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
                        <Link
                            href="/analyze"
                            className="text-sm font-medium text-teal-700 hover:text-teal-900 transition-colors hidden sm:block"
                        >
                            🔍 Analyze
                        </Link>
                        <span className="text-sm text-text-muted hidden sm:block">
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

            {/* ─── Content ─────────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        </div>
    );
}
