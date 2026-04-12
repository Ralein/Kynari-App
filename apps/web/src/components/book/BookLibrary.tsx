"use client";

import { BookOpen, Loader2, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type BookListItem } from "@/lib/api";

interface BookLibraryProps {
    loading: boolean;
    books: BookListItem[];
    onDelete: (id: string) => void;
}

export function BookLibrary({ loading, books, onDelete }: BookLibraryProps) {
    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#F0897A]" />
            </div>
        );
    }

    if (books.length === 0) {
        return (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-[#4a4b5e] font-medium mb-1">No stories yet</p>
                <p className="text-sm text-slate-400">
                    Create your first personalized picture book!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {books.map((book) => (
                <div
                    key={book.id}
                    className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-5 flex items-center gap-4 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FCECD8] to-[#FFE5E0] flex items-center justify-center shrink-0">
                        <BookOpen className="w-7 h-7 text-[#F3A595]" />
                    </div>
                    <Link href={`/soothe/stories/${book.id}`} className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-[#1a1b2e] truncate group-hover:text-[#F0897A] transition-colors">
                            {book.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {book.page_count} pages · {book.theme} · {book.style}
                            {book.child_name && ` · starring ${book.child_name}`}
                        </p>
                    </Link>
                    <button
                        onClick={() => onDelete(book.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <Link href={`/soothe/stories/${book.id}`}>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#F0897A] transition-colors" />
                    </Link>
                </div>
            ))}
        </div>
    );
}
