"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBook, type BookResponse } from "@/lib/api";
import {
    ChevronRight,
    ChevronLeft,
    BookOpen,
    Loader2,
} from "lucide-react";

export default function BookReaderPage() {
    const { getToken } = useAuth();
    const params = useParams();
    const bookId = params.bookId as string;

    const [book, setBook] = useState<BookResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        async function load() {
            try {
                const token = await getToken();
                if (!token) return;
                const data = await getBook(token, bookId);
                setBook(data);
            } catch { /* silent */ }
            finally { setLoading(false); }
        }
        load();
    }, [getToken, bookId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#F0897A]" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="animate-fade-in relative z-10 w-full mx-auto max-w-3xl text-center py-20">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-[#4a4b5e] font-medium">Book not found</p>
                <Link href="/soothe/stories" className="text-sm text-[#F0897A] font-semibold mt-2 inline-block">
                    Back to library
                </Link>
            </div>
        );
    }

    const page = book.pages[currentPage];
    const totalPages = book.pages.length;
    const isFirst = currentPage === 0;
    const isLast = currentPage === totalPages - 1;

    // Page background colors that cycle
    const PAGE_BG = [
        "from-[#FFE5E0]/40 to-[#FCECD8]/30",
        "from-[#D6F4FF]/40 to-[#C2ECFB]/30",
        "from-[#EAE2FB]/40 to-[#D8D0F0]/30",
        "from-[#D5F5E3]/40 to-[#B5EAC5]/30",
        "from-[#FCECD8]/40 to-[#FFE5E0]/30",
    ];

    return (
        <div className="animate-fade-in relative z-10 w-full mx-auto max-w-3xl space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Link href="/soothe" className="hover:text-[#1a1b2e] transition-colors">
                    Soothe
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/soothe/stories" className="hover:text-[#1a1b2e] transition-colors">
                    Stories
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold truncate max-w-[200px]">
                    {book.title}
                </span>
            </div>

            {/* Book Page */}
            <div className={`bg-gradient-to-br ${PAGE_BG[currentPage % PAGE_BG.length]} border border-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 sm:p-12 min-h-[400px] flex flex-col justify-center transition-all duration-500`}>
                {/* Page number */}
                <div className="text-center mb-8">
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                        Page {currentPage + 1} of {totalPages}
                    </span>
                </div>

                {/* Story text */}
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-xl sm:text-2xl font-medium text-[#1a1b2e] leading-relaxed text-center max-w-lg animate-fade-in font-[family-name:var(--font-sans)]">
                        {page?.text}
                    </p>
                </div>

                {/* Illustration placeholder */}
                <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{book.style} illustration · {book.theme}</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={isFirst}
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-30 bg-white/70 border border-white/80 text-[#1a1b2e] hover:shadow-md hover:-translate-y-0.5"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                </button>

                {/* Page dots */}
                <div className="flex items-center gap-1.5">
                    {book.pages.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                i === currentPage
                                    ? "bg-[#F0897A] w-6"
                                    : "bg-slate-200 hover:bg-slate-300"
                            }`}
                        />
                    ))}
                </div>

                <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={isLast}
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-30 bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] hover:shadow-lg hover:-translate-y-0.5"
                >
                    Next
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
