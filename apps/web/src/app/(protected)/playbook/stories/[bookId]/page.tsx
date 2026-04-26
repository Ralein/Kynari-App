"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBook, getVoices, generateSpeechUrl, speakText, type BookResponse, type VoiceInfo } from "@/lib/api";
import {
    ChevronRight,
    ChevronLeft,
    BookOpen,
    Loader2,
    Volume2,
    VolumeX,
    Moon,
} from "lucide-react";

export default function BookReaderPage() {
    const { getToken } = useAuth();
    const params = useParams();
    const bookId = params.bookId as string;

    const [book, setBook] = useState<BookResponse | null>(null);
    const [voices, setVoices] = useState<VoiceInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    // Read Aloud state
    const [selectedVoice, setSelectedVoice] = useState("af_sarah");
    const [isSoothingMode, setIsSoothingMode] = useState(false);
    const [isReading, setIsReading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const token = await getToken();
                if (!token) return;
                
                const [bookData, voicesData] = await Promise.all([
                    getBook(token, bookId),
                    getVoices(token),
                ]);
                
                setBook(bookData);
                setVoices(voicesData);
            } catch (err) {
                console.error("Failed to load book or voices:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [getToken, bookId]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Stop speech
    const stopSpeech = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsReading(false);
        setGenerating(false);
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        stopSpeech();
        setCurrentPage(newPage);
    }, [stopSpeech]);

    const handleReadAloud = async () => {
        if (!book || generating) return;

        // If already reading, stop
        if (isReading) {
            stopSpeech();
            return;
        }

        const pageText = book.pages[currentPage]?.text;
        if (!pageText) return;

        setGenerating(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("No token");

            const activeVoice = isSoothingMode ? "af_heart" : selectedVoice;
            const activeSpeed = isSoothingMode ? 0.85 : 1.0;
            const url = generateSpeechUrl(token, activeVoice, pageText, activeSpeed);

            const audio = new Audio(url);
            audioRef.current = audio;
            
            audio.oncanplay = () => {
                setGenerating(false);
                audio.play();
                setIsReading(true);
            };

            audio.onended = () => {
                setIsReading(false);
            };

            audio.onerror = () => {
                console.error("Audio playback error");
                setGenerating(false);
                setIsReading(false);
            };

        } catch (err) {
            console.error("Read Aloud failed:", err);
            setIsReading(false);
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#F0897A] mb-4" />
                <p className="text-slate-500 text-sm">Loading Story Book...</p>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="animate-fade-in relative z-10 w-full mx-auto text-center py-20">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-[#4a4b5e] font-medium">Book not found</p>
                <Link href="/playbook/stories" className="text-sm text-[#F0897A] font-semibold mt-2 inline-block">
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
        <div className="animate-fade-in relative z-10 w-full mx-auto space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/playbook" className="hover:text-[#6B48C8] transition-colors">Playbook</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/playbook/stories" className="hover:text-[#6B48C8] transition-colors">Story Book</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold truncate max-w-[200px]">
                    {book.title}
                </span>
            </div>

            {/* Header with Read Aloud controls */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                        {book.title}
                    </h1>
                    <p className="text-sm text-[#4a4b5e] mt-1">
                        {book.theme} · {book.style}
                        {book.child_name && ` · starring ${book.child_name}`}
                    </p>
                </div>

                {/* Read Aloud Controls */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    {/* Voice selector */}
                    <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-[#1a1b2e] focus:outline-none focus:ring-2 focus:ring-[#F0897A]/20 shadow-sm"
                    >
                        {voices.map((v) => (
                            <option key={v.voice_id} value={v.voice_id}>
                                {v.name} ({v.style})
                            </option>
                        ))}
                    </select>

                    {/* Soothing Mode Toggle */}
                    <button
                        onClick={() => setIsSoothingMode(!isSoothingMode)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                            isSoothingMode
                                ? "bg-[#EAE2FB] border-[#6B48C8]/30 text-[#6B48C8] shadow-sm tracking-wide"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                        title="Plays a warm voice for bedtime"
                    >
                        <Moon className={`w-3.5 h-3.5 ${isSoothingMode ? "fill-[#6B48C8]" : ""}`} />
                        Soothing Mode
                    </button>

                    {/* Read Aloud button */}
                    <button
                        onClick={handleReadAloud}
                        disabled={generating}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm ${
                            isReading
                                ? "bg-[#F0897A] text-white shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] hover:bg-[#E87A6A]"
                                : generating
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] hover:shadow-lg hover:-translate-y-0.5"
                        }`}
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Thinking...
                            </>
                        ) : isReading ? (
                            <>
                                <VolumeX className="w-4 h-4" />
                                Stop
                            </>
                        ) : (
                            <>
                                <Volume2 className="w-4 h-4" />
                                Read Aloud
                            </>
                        )}
                    </button>
                </div>
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

                {/* Reading or Generating indicator */}
                {(isReading || generating) && (
                    <div className="mt-6 flex items-center justify-center gap-2 animate-fade-in">
                        <div className="flex items-center gap-1">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1 bg-[#F0897A] rounded-full ${isReading ? "animate-pulse" : "animate-bounce"}`}
                                    style={{
                                        height: `${12 + Math.random() * 12}px`,
                                        animationDelay: `${i * 0.15}s`,
                                    }}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-[#F0897A] font-medium ml-2">
                            {generating ? "Waking up natural voice..." : "Reading aloud..."}
                        </span>
                    </div>
                )}

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
                    onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
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
                            onClick={() => handlePageChange(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                i === currentPage
                                    ? "bg-[#F0897A] w-6"
                                    : "bg-slate-200 hover:bg-slate-300"
                            }`}
                        />
                    ))}
                </div>

                <button
                    onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
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
