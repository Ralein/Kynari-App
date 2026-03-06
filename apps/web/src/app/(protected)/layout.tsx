import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BackgroundGradients } from "@/components/ui/BackgroundGradients";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let user;
    try {
        user = await currentUser();
    } catch (error) {
        console.error("Clerk currentUser() error:", error);
    }

    if (!user) {
        redirect("/login");
    }

    const email = user.emailAddresses[0]?.emailAddress;

    return (
        <div className="min-h-screen bg-[#Fdfbf9] font-[family-name:var(--font-sans)] text-[#1C1C2A] relative overflow-hidden">
            <BackgroundGradients />
            <TopNav email={email} />

            {/* ─── Content ─────────────────────────────────── */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
                {children}
            </main>

            <BottomNav />
        </div>
    );
}
