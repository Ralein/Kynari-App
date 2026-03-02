import Link from "next/link";

export default function DashboardPage() {
    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-sans)]">
                    Good afternoon 👋
                </h1>
                <p className="text-text-secondary mt-1">
                    Here&apos;s how your little ones are doing today.
                </p>
            </div>

            {/* Empty State */}
            <div className="glass-dark rounded-2xl p-12 text-center max-w-lg mx-auto mt-16">
                <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">👶</span>
                </div>
                <h2 className="text-xl font-semibold mb-2 font-[family-name:var(--font-sans)]">
                    Add your first child
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                    Start by adding a child profile. Kynari will learn their emotional
                    baseline over the first 7 days.
                </p>
                <Link
                    href="/onboarding"
                    className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-200 hover:scale-[1.02]"
                >
                    Get Started
                </Link>
            </div>
        </div>
    );
}
