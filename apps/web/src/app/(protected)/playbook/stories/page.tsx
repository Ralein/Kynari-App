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
    Compass,
    Heart,
    Loader2,
    Moon,
    Palette,
    Plus,
    Sparkles,
    Trash2,
    TreePine,
} from "lucide-react";
import { BookGenerator } from "@/components/book/BookGenerator";
import { BookLibrary } from "@/components/book/BookLibrary";

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
        <div className="animate-fade-in space-y-6 relative z-10 w-full mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/playbook" className="hover:text-[#6B48C8] transition-colors">Playbook</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Story Book</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        AI Story Book
                    </h1>
                    <p className="text-sm text-[#4a4b5e] mt-1">
                        Personalized illustrated storybooks starring your little one.
                    </p>
                </div>
                <button
                    onClick={() => setShowGenerator(!showGenerator)}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] gap-2 self-start sm:self-auto"
                >
                    {showGenerator ? <Heart className="w-4 h-4 fill-white animate-pulse" /> : <Plus className="w-4 h-4" />}
                    {showGenerator ? "Creating magic..." : "New Book"}
                </button>
            </div>

            {/* Generator Panel */}
            <BookGenerator 
                show={showGenerator} 
                generating={generating} 
                childName={childName} 
                selectedTheme={selectedTheme} 
                selectedStyle={selectedStyle} 
                themes={THEMES} 
                styles={STYLES} 
                onChildNameChange={setChildName} 
                onThemeSelect={setSelectedTheme} 
                onStyleSelect={setSelectedStyle} 
                onGenerate={handleGenerate} 
            />

            {/* Book Library */}
            <BookLibrary 
                loading={loading} 
                books={books} 
                onDelete={handleDelete} 
            />
        </div>
    );
}
