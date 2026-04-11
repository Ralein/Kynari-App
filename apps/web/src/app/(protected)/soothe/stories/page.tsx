"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useChildren } from "@/lib/hooks";
import {
    listBooks,
    generateBook,
    deleteBook,
    type BookListItem,
} from "@/lib/api";
import {
    BookOpen,
    ChevronRight,
    Plus,
    Loader2,
    Trash2,
    Sparkles,
    Palette,
    TreePine,
    Moon,
    Compass,
    Heart,
} from "lucide-react";

const THEMES = [
    { id: "bedtime", label: "Bedtime", icon: Moon, color: "#6B48C8" },
    { id: "adventure", label: "Adventure", icon: Compass, color: "#F0897A" },
    { id: "nature", label: "Nature", icon: TreePine, color: "#7BC89D" },
    { id: "friendship", label: "Friendship", icon: Heart, color: "#93E2FA" },
];

const STYLES = [
    { id: "watercolor", label: "Watercolor" },
    { id: "cartoon", label: "Cartoon" },
    { id: "storybook", label: "Storybook" },
    { id: "pastel", label: "Pastel" },
];

export default function StoriesPage() {
    const { getToken } = useAuth();
    const { data: children } = useChildren();
    const [books, setBooks] = useState<BookListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);

    // Generator state
    const [selectedChild, setSelectedChild] = useState("");
    const [childName, setChildName] = useState("");
    const [selectedTheme, setSelectedTheme] = useState("bedtime");
    const [selectedStyle, setSelectedStyle] = useState("watercolor");

    useEffect(() => {
        if (children?.length && !selectedChild) {
            setSelectedChild(children[0].id);
            setChildName(children[0].name);
        }
    }, [children, selectedChild]);

    useEffect(() => {
        async function load() {
            try {
                const token = await getToken();
                if (!token) return;
                const list = await listBooks(token);
                setBooks(list);
            } catch { /* silent */ }
            finally { setLoading(false); }
        }
        load();
    }, [getToken]);

    const handleGenerate = async () => {
        if (!childName.trim()) return;
        setGenerating(true);
        try {
            const token = await getToken();
            if (!token) return;
            const book = await generateBook(token, {
                child_id: selectedChild || undefined,
                child_name: childName,
                theme: selectedTheme,
                style: selectedStyle,
            });
            // Refresh list
            const list = await listBooks(token);
            setBooks(list);
            setShowGenerator(false);
        } catch { /* silent */ }
        finally { setGenerating(false); }
    };

    const handleDelete = async (bookId: string) => {
        try {
            const token = await getToken();
            if (!token) return;
            await deleteBook(token, bookId);
            setBooks((prev) => prev.filter((b) => b.id !== bookId));
        } catch { /* silent */ }
    };

    return (
        <div className="animate-fade-in relative z-10 w-full mx-auto max-w-3xl space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Link href="/soothe" className="hover:text-[#1a1b2e] transition-colors">
                    Soothe
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Picture Book</span>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-br from-[#FCECD8]/60 to-[#FFE5E0]/30 border border-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <BookOpen className="w-6 h-6 text-[#F3A595]" />
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                                Picture Book
                            </h1>
                        </div>
                        <p className="text-sm text-[#4a4b5e]">
                            AI-generated stories starring your little one.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowGenerator(!showGenerator)}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Book
                    </button>
                </div>
            </div>

            {/* Generator Panel */}
            {showGenerator && (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 space-y-5 animate-fade-in">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-[#6B48C8]" />
                        <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                            Create a New Story
                        </h2>
                    </div>

                    {/* Child Name */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                            Main character name
                        </label>
                        <input
                            type="text"
                            value={childName}
                            onChange={(e) => setChildName(e.target.value)}
                            placeholder="Your baby's name"
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#1a1b2e] focus:outline-none focus:ring-2 focus:ring-[#F0897A]/30 focus:border-[#F0897A]"
                        />
                    </div>

                    {/* Theme */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-2">
                            Story theme
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {THEMES.map((theme) => {
                                const Icon = theme.icon;
                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedTheme(theme.id)}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                                            selectedTheme === theme.id
                                                ? "border-[#F0897A]/30 shadow-sm"
                                                : "bg-white/50 border-white/80 hover:bg-white/80"
                                        }`}
                                        style={selectedTheme === theme.id ? { backgroundColor: `${theme.color}15` } : undefined}
                                    >
                                        <Icon className="w-5 h-5" style={{ color: theme.color }} />
                                        <span className="text-xs font-semibold text-[#1a1b2e]">{theme.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Style */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Palette className="w-3.5 h-3.5 text-[#6B48C8]" />
                            <label className="text-xs font-semibold text-slate-500">
                                Art style
                            </label>
                        </div>
                        <div className="flex gap-2">
                            {STYLES.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style.id)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                        selectedStyle === style.id
                                            ? "bg-[#6B48C8] text-white shadow-sm"
                                            : "bg-white/70 text-slate-500 border border-white/80 hover:bg-white/90"
                                    }`}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !childName.trim()}
                        className="w-full px-6 py-3.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating story...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Book
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Book Library */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#F0897A]" />
                </div>
            ) : books.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-8 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-[#4a4b5e] font-medium mb-1">No stories yet</p>
                    <p className="text-sm text-slate-400">
                        Create your first personalized picture book!
                    </p>
                </div>
            ) : (
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
                                onClick={() => handleDelete(book.id)}
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
            )}
        </div>
    );
}
