import Link from "next/link";
import { EMOTION_EMOJI } from "@kynari/shared";

export default async function ChildReportPage({
    params,
}: {
    params: Promise<{ childId: string }>;
}) {
    const { childId } = await params;

    return (
        <div className="animate-fade-in">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
                <Link href="/dashboard" className="hover:text-teal-600 transition-colors">
                    Dashboard
                </Link>
                <span>/</span>
                <span className="text-text-primary font-medium">Child Report</span>
            </div>

            {/* Placeholder Report */}
            <div className="glass rounded-2xl p-8 max-w-2xl">
                <h1 className="text-2xl font-bold mb-4 font-[family-name:var(--font-sans)]">
                    Emotional Report
                </h1>
                <p className="text-text-secondary text-sm mb-6">
                    Child ID: <code className="px-2 py-0.5 bg-stone-100 rounded text-xs">{childId}</code>
                </p>

                {/* Emotion Legend */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
                    {(Object.entries(EMOTION_EMOJI) as [string, string][]).map(
                        ([emotion, emoji]) => (
                            <div
                                key={emotion}
                                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-stone-50 border border-stone-100"
                            >
                                <span className="text-2xl">{emoji}</span>
                                <span className="text-xs text-text-secondary capitalize">
                                    {emotion}
                                </span>
                            </div>
                        )
                    )}
                </div>

                <div className="bg-teal-50/50 rounded-xl p-6 border border-teal-100/50">
                    <p className="text-sm text-teal-800">
                        📊 Charts, timeline, and detailed event log will appear here once
                        monitoring sessions are recorded in Phase 2.
                    </p>
                </div>
            </div>
        </div>
    );
}
