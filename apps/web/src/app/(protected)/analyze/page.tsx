"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useToken, useChildren } from "@/lib/hooks";
import {
    analyzeImage,
    analyzeAudio,
    analyzeVideo,
    analyzeCombined,
    saveAnalysisResult,
} from "@/lib/api";
import type { AnalyzeImageResult } from "@/lib/api";
import { NEED_EMOJI, NEED_COLORS, NEED_ADVICE, DISTRESS_SCALE, type NeedLabel } from "@kynari/shared";
import {
    Camera, Mic, Upload, ChevronRight, Save, CheckCircle2,
    AlertCircle, Stethoscope, Lightbulb, Volume2, ThumbsUp, ThumbsDown,
    Search,
} from "lucide-react";

type Tab = "camera" | "audio" | "upload";

type AnalysisResult = {
    type: "face" | "audio" | "video";
    need_label?: string;
    need_description?: string;
    confidence?: number;
    secondary_need?: string;
    all_needs?: Record<string, number>;
    distress_score?: number;
    distress_intensity?: string;
    stress_features?: Record<string, number>;
    fusion_weights?: Record<string, number>;
    expression?: string;
    expression_confidence?: number;
    raw?: Record<string, unknown>;
};

// ─── Helper: Severity from confidence/distress ──────────────
function getSeverity(score: number): "low" | "medium" | "high" {
    if (score < 0.35) return "low";
    if (score < 0.65) return "medium";
    return "high";
}

function getDistressLevel(score: number): number {
    return Math.round(score * 10);
}

function getDistressInfo(level: number) {
    return DISTRESS_SCALE.find(s => level >= s.min && level <= s.max) || DISTRESS_SCALE[0];
}

// ─── Analysis phase labels for the loading overlay ──────────
const ANALYSIS_PHASES = [
    { label: "Detecting face landmarks…", icon: "🔍" },
    { label: "Running neural network…", icon: "🧠" },
    { label: "Classifying expression…", icon: "😶" },
    { label: "Mapping action units…", icon: "📐" },
    { label: "Predicting baby needs…", icon: "🎯" },
];

function AnalyzingOverlay() {
    const [phaseIndex, setPhaseIndex] = useState(0);

    useEffect(() => {
        const phaseInterval = setInterval(() => {
            setPhaseIndex((prev) => Math.min(prev + 1, ANALYSIS_PHASES.length - 1));
        }, 2000);
        return () => {
            clearInterval(phaseInterval);
        };
    }, []);

    const progressPct = Math.min(Math.round(((phaseIndex + 1) / ANALYSIS_PHASES.length) * 100), 96);

    return (
        <div className="card-soft p-8 sm:p-10 animate-fade-in overflow-hidden">
            <div className="flex flex-col items-center text-center">

                {/* ── Animated scanning area ──────────────────── */}
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-8">
                    {/* Concentric pulse rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute w-28 h-28 rounded-full border-2 border-primary-300/40 animate-ring-1" />
                        <div className="absolute w-28 h-28 rounded-full border-2 border-primary-300/30 animate-ring-2" />
                        <div className="absolute w-28 h-28 rounded-full border-2 border-primary-300/20 animate-ring-3" />
                    </div>

                    {/* Baby face silhouette circle */}
                    <div className="absolute inset-6 sm:inset-8 rounded-full bg-gradient-to-br from-primary-100 via-primary-50 to-white border-2 border-primary-200/60 shadow-inner" />

                    {/* Inner baby emoji */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl sm:text-6xl opacity-25 select-none">👶</span>
                    </div>

                    {/* Horizontal scan beam (sweeps vertically) */}
                    <div className="absolute inset-x-6 sm:inset-x-8 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary-500/70 to-transparent animate-scan-beam" />

                    {/* Scanning magnifying glass */}
                    <div className="absolute inset-0 flex items-center justify-center animate-magnify-scan">
                        <div className="relative">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full animate-lens-glow flex items-center justify-center">
                                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600 drop-shadow-lg" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Text ───────────────────────────────────── */}
                <h3 className="text-xl font-extrabold text-text-primary mb-1.5 font-[family-name:var(--font-sans)]">
                    Analyzing…
                </h3>
                <div className="flex items-center gap-2 h-6 mb-6">
                    <span className="text-base">{ANALYSIS_PHASES[phaseIndex].icon}</span>
                    <p className="text-sm text-primary-600 font-semibold transition-all duration-500">
                        {ANALYSIS_PHASES[phaseIndex].label}
                    </p>
                </div>

                {/* ── Step indicators ────────────────────────── */}
                <div className="flex items-center gap-1.5 mb-5">
                    {ANALYSIS_PHASES.map((phase, i) => (
                        <div
                            key={i}
                            title={phase.label}
                            className={`h-2 rounded-full transition-all duration-500 ${i <= phaseIndex
                                ? "w-6 bg-gradient-to-r from-primary-500 to-primary-400"
                                : "w-2 bg-primary-200/60"
                                }`}
                        />
                    ))}
                </div>

                {/* ── Progress bar ───────────────────────────── */}
                <div className="w-full max-w-xs">
                    <div className="h-2.5 rounded-full bg-primary-100/80 overflow-hidden shadow-inner">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 transition-all duration-700 ease-out relative"
                            style={{ width: `${progressPct}%` }}
                        >
                            {/* Shimmer on the progress bar */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse-soft" />
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-[11px] text-text-muted">This usually takes a few seconds</p>
                        <p className="text-[11px] font-bold text-primary-500">{progressPct}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AnalyzePage() {
    const token = useToken();
    const { data: children } = useChildren();
    const [activeTab, setActiveTab] = useState<Tab>("camera");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedChild, setSelectedChild] = useState<string>("");
    const [saved, setSaved] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const [combinedMode, setCombinedMode] = useState(false);
    const faceResultRef = useRef<AnalyzeImageResult | null>(null);

    useEffect(() => {
        if (children?.length && !selectedChild) {
            // Use setTimeout to avoid synchronous setState inside effect warning
            const timer = setTimeout(() => {
                setSelectedChild(children[0].id);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [children, selectedChild]);

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "camera", label: "Scan Face", icon: <Camera className="w-4 h-4" /> },
        { key: "audio", label: "Record Audio", icon: <Mic className="w-4 h-4" /> },
        { key: "upload", label: "Upload File", icon: <Upload className="w-4 h-4" /> },
    ];

    // ─── Camera capture ──────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraActive, setCameraActive] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraActive(true);
            setError(null);
        } catch {
            setError("Could not access camera. Please allow camera permissions.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraActive(false);
    }, []);

    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !token) return;
        setIsAnalyzing(true);
        setResult(null);
        setError(null);
        setSaved(false);
        setFeedbackGiven(false);

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                setError("Failed to capture image");
                setIsAnalyzing(false);
                return;
            }
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            try {
                const res = await analyzeImage(token, file);
                if (res.success) {
                    setResult({
                        type: "face",
                        need_label: res.need_label,
                        need_description: res.need_description,
                        confidence: res.confidence,
                        secondary_need: res.secondary_need,
                        all_needs: res.all_needs,
                        distress_score: res.distress_score,
                        distress_intensity: res.distress_intensity,
                        stress_features: res.stress_features,
                        expression: res.expression,
                        expression_confidence: res.expression_confidence,
                        raw: res as unknown as Record<string, unknown>,
                    });
                } else {
                    setError(res.message || "Analysis failed");
                }
            } catch {
                setError("Failed to connect to analysis server");
            }
            setIsAnalyzing(false);
        }, "image/jpeg", 0.9);
    }, [token]);

    // ─── Audio recording ─────────────────────────────────────
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                if (timerRef.current) clearInterval(timerRef.current);

                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                if (!token) return;

                setIsAnalyzing(true);
                setResult(null);
                setError(null);
                setSaved(false);
                setFeedbackGiven(false);

                try {
                    const file = new File([blob], "recording.webm", { type: "audio/webm" });

                    // If in combined mode and we have a stored face result, use combined endpoint
                    if (combinedMode && faceResultRef.current) {
                        const res = await analyzeCombined(token, file, {
                            distress_score: faceResultRef.current.distress_score,
                            distress_intensity: faceResultRef.current.distress_intensity,
                            stress_features: faceResultRef.current.stress_features,
                        });
                        if (res.success) {
                            setResult({
                                type: "video", // "video" type triggers combined display
                                need_label: res.need_label,
                                need_description: res.need_description,
                                confidence: res.confidence,
                                secondary_need: res.secondary_need,
                                all_needs: res.all_needs,
                                fusion_weights: res.fusion_weights,
                                raw: res as unknown as Record<string, unknown>,
                            });
                        } else {
                            setError(res.message || "Combined analysis failed");
                        }
                        setCombinedMode(false);
                        faceResultRef.current = null;
                    } else {
                        const res = await analyzeAudio(token, file);
                        if (res.success) {
                            setResult({
                                type: "audio",
                                need_label: res.need_label,
                                need_description: res.need_description,
                                confidence: res.confidence,
                                secondary_need: res.secondary_need,
                                all_needs: res.all_needs,
                                raw: res as unknown as Record<string, unknown>,
                            });
                        } else {
                            setError(res.message || "Audio analysis failed");
                        }
                    }
                } catch {
                    setError("Failed to connect to analysis server");
                    setCombinedMode(false);
                }
                setIsAnalyzing(false);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);

            setTimeout(() => {
                if (mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                    setIsRecording(false);
                }
            }, 10000);
        } catch {
            setError("Could not access microphone. Please allow microphone permissions.");
        }
    }, [token, combinedMode]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    // ─── File upload ─────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = useCallback(
        async (file: File) => {
            if (!token) return;
            setIsAnalyzing(true);
            setResult(null);
            setError(null);
            setSaved(false);
            setFeedbackGiven(false);

            try {
                if (file.type.startsWith("image/")) {
                    const res = await analyzeImage(token, file);
                    if (res.success) {
                        setResult({
                            type: "face",
                            need_label: res.need_label,
                            need_description: res.need_description,
                            confidence: res.confidence,
                            secondary_need: res.secondary_need,
                            all_needs: res.all_needs,
                            distress_score: res.distress_score,
                            distress_intensity: res.distress_intensity,
                            stress_features: res.stress_features,
                            expression: res.expression,
                            expression_confidence: res.expression_confidence,
                            raw: res as unknown as Record<string, unknown>,
                        });
                    } else {
                        setError(res.message || "Image analysis failed");
                    }
                } else if (file.type.startsWith("audio/")) {
                    const res = await analyzeAudio(token, file);
                    if (res.success) {
                        setResult({
                            type: "audio",
                            need_label: res.need_label,
                            need_description: res.need_description,
                            confidence: res.confidence,
                            secondary_need: res.secondary_need,
                            all_needs: res.all_needs,
                            raw: res as unknown as Record<string, unknown>,
                        });
                    } else {
                        setError(res.message || "Audio analysis failed");
                    }
                } else if (file.type.startsWith("video/")) {
                    const res = await analyzeVideo(token, file);
                    if (res.success) {
                        setResult({
                            type: "video",
                            need_label: res.need_label,
                            need_description: res.need_description,
                            confidence: res.confidence,
                            secondary_need: res.secondary_need,
                            all_needs: res.all_needs,
                            fusion_weights: res.fusion_weights,
                            raw: res as unknown as Record<string, unknown>,
                        });
                    } else {
                        setError(res.message || "Video analysis failed");
                    }
                } else {
                    setError("Unsupported file type. Please upload an image, audio, or video file.");
                }
            } catch {
                setError("Failed to connect to analysis server");
            }
            setIsAnalyzing(false);
        },
        [token]
    );

    // ─── Save result ─────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!result || !token || !selectedChild) return;
        const needLabel = result.need_label || (
            result.distress_score !== undefined
                ? (result.distress_score > 0.5 ? "pain" : "calm")
                : "calm"
        );
        const confidence = result.confidence ?? result.distress_score ?? 0;

        try {
            const res = await saveAnalysisResult(token, {
                child_id: selectedChild,
                need_label: needLabel,
                confidence,
                modality: result.type === "face" ? "face" : result.type === "audio" ? "voice" : "combined",
                secondary_need: result.secondary_need,
                all_needs: result.all_needs,
                face_distress_score: result.distress_score,
                raw_result: result.raw,
            });
            if (res.success) {
                setSaved(true);
            } else {
                setError("Failed to save result. Please try again.");
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to save result";
            setError(message);
        }
    }, [result, token, selectedChild]);

    useEffect(() => {
        return () => {
            stopCamera();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [stopCamera]);

    // ─── Computed display values ─────────────────────────────
    const primaryScore = result?.confidence ?? result?.distress_score ?? 0;
    const severity = getSeverity(primaryScore);
    const distressLevel = getDistressLevel(result?.distress_score ?? primaryScore);
    const distressInfo = getDistressInfo(distressLevel);
    const needKey = (result?.need_label || (result?.distress_score !== undefined
        ? (result.distress_score > 0.5 ? "pain" : "calm") : "calm")) as NeedLabel;
    const advice = NEED_ADVICE[needKey];

    return (
        <div className="animate-fade-in space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
                <Link href="/dashboard" className="hover:text-primary-600 transition-colors">
                    Dashboard
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-text-primary font-semibold">Analyze</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)]">
                    Analyze Baby Needs
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                    Scan your baby&apos;s face, record their sounds, or upload a file to understand what they need
                </p>
            </div>

            {/* Child selector */}
            {children && children.length > 1 && (
                <div className="flex items-center gap-3">
                    <label className="text-sm text-text-secondary font-medium" htmlFor="child-select">Analyzing for:</label>
                    <select
                        id="child-select"
                        value={selectedChild}
                        onChange={(e) => setSelectedChild(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-primary-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                    >
                        {children.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 bg-primary-50 rounded-2xl p-1.5">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            setActiveTab(tab.key);
                            setResult(null);
                            setError(null);
                            setSaved(false);
                            setFeedbackGiven(false);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.key
                            ? "bg-white shadow-sm text-primary-700 shadow-primary-500/5"
                            : "text-text-muted hover:text-text-secondary"
                            }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="card-soft p-6 sm:p-8">
                {/* Camera Tab */}
                {activeTab === "camera" && (
                    <div className="space-y-4">
                        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video max-w-xl mx-auto">
                            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`} />
                            <canvas ref={canvasRef} className="hidden" />
                            {!cameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                                    <Camera className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-sm">Camera preview will appear here</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center gap-3">
                            {!cameraActive ? (
                                <button onClick={startCamera} className="btn-primary"><Camera className="w-4 h-4" /> Start Camera</button>
                            ) : (
                                <>
                                    <button onClick={captureAndAnalyze} disabled={isAnalyzing} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                        Capture & Analyze
                                    </button>
                                    <button onClick={stopCamera} className="btn-secondary">Stop Camera</button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Audio Tab */}
                {activeTab === "audio" && (
                    <div className="space-y-4">
                        <div className="bg-gray-900 rounded-2xl p-8 max-w-xl mx-auto flex flex-col items-center">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${isRecording ? "bg-red-500/20 animate-pulse" : "bg-white/10"}`}>
                                <Mic className={`w-10 h-10 ${isRecording ? "text-red-400" : "text-white/50"}`} />
                            </div>
                            {isRecording && <p className="text-white/80 text-sm mb-2 font-medium">Recording... {recordingTime}s / 10s</p>}
                            {combinedMode && !isRecording && (
                                <div className="mb-3 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                                    <p className="text-indigo-300 text-xs font-semibold">🔗 Combined Mode — face scan captured, now record audio for fused analysis</p>
                                </div>
                            )}
                            <p className="text-white/50 text-xs text-center">
                                {isRecording ? "Recording will auto-stop at 10 seconds" : "Hold your phone near your baby to capture their sounds"}
                            </p>
                        </div>
                        <div className="flex justify-center">
                            {!isRecording ? (
                                <button onClick={startRecording} disabled={isAnalyzing} className="btn-primary disabled:opacity-50">
                                    <Mic className="w-4 h-4" /> Start Recording
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
                                    Stop Recording
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Upload Tab */}
                {activeTab === "upload" && (
                    <div className="space-y-4">
                        <div
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors max-w-xl mx-auto cursor-pointer ${dragOver ? "border-primary-500 bg-primary-50/50" : "border-primary-200 hover:border-primary-400"}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 text-primary-300 mx-auto mb-3" />
                            <p className="text-text-secondary text-sm font-medium">Drag & drop or click to upload</p>
                            <p className="text-text-muted text-xs mt-1">Images (JPG, PNG) · Audio (WAV, MP3) · Video (MP4, WebM)</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
                    </div>
                )}
            </div>

            {/* Analyzing Overlay */}
            {isAnalyzing && <AnalyzingOverlay />}

            {/* Error Display — actionable, suggests retry */}
            {error && (
                <div className="card-soft p-6 border-l-4 border-red-300 bg-red-50/50 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-red-800 text-sm mb-1">
                                {error.includes("face") || error.includes("Face") || error.includes("photo")
                                    ? "😕 Couldn't detect a face"
                                    : error.includes("audio") || error.includes("Audio") || error.includes("short")
                                        ? "🎙️ Audio issue"
                                        : error.includes("connect") || error.includes("server")
                                            ? "📡 Connection issue"
                                            : "⚠️ Something went wrong"}
                            </p>
                            <p className="text-red-700 text-sm mb-3">{error}</p>
                            <div className="text-xs text-red-600 space-y-1 mb-4">
                                {(error.includes("face") || error.includes("Face") || error.includes("photo") || error.includes("image") || error.includes("Image")) && (
                                    <>
                                        <p>💡 Make sure your baby&apos;s face is clearly visible and well-lit</p>
                                        <p>💡 Try moving closer or adjusting the angle</p>
                                        <p>💡 Avoid blurry photos — hold the camera steady</p>
                                    </>
                                )}
                                {(error.includes("audio") || error.includes("Audio") || error.includes("short") || error.includes("record")) && (
                                    <>
                                        <p>💡 Record for at least 2–3 seconds of your baby&apos;s sounds</p>
                                        <p>💡 Hold your phone closer to your baby</p>
                                        <p>💡 Reduce background noise if possible</p>
                                    </>
                                )}
                                {(error.includes("connect") || error.includes("server")) && (
                                    <p>💡 Check your internet connection and try again</p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setResult(null);
                                    setSaved(false);
                                    setFeedbackGiven(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                RESULTS SECTION — ChatterBaby-inspired
               ═══════════════════════════════════════════════════════ */}
            {result && (
                <div className="space-y-4 animate-slide-up">

                    {/* ── 1. Distress Severity Scale ─────────────────── */}
                    <div className="card-soft p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-5">
                            <Stethoscope className="w-5 h-5 text-primary-600" />
                            <h3 className="text-lg font-bold font-[family-name:var(--font-sans)]">
                                {result.type === "face" ? "Distress Assessment" : "Analysis Results"}
                            </h3>
                        </div>

                        {/* Distress gauge */}
                        <div className="mb-6">
                            <div className="flex items-center gap-4 mb-3">
                                <span className="text-5xl">{distressInfo.emoji}</span>
                                <div>
                                    <p className="text-2xl font-extrabold" style={{ color: distressInfo.color }}>
                                        {distressLevel}/10
                                    </p>
                                    <p className="text-sm font-semibold text-text-secondary">{distressInfo.label} distress</p>
                                </div>
                            </div>

                            {/* Gradient scale bar */}
                            <div className="relative mt-4">
                                <div className="h-4 rounded-full overflow-hidden" style={{
                                    background: "linear-gradient(to right, #22C55E, #84CC16, #EAB308, #F97316, #EF4444)"
                                }}>
                                    <div
                                        className="absolute top-0 w-5 h-5 rounded-full bg-white border-3 border-gray-800 shadow-lg -translate-x-1/2 -translate-y-[2px]"
                                        style={{ left: `${Math.min(distressLevel * 10, 100)}%`, borderWidth: "3px" }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1.5 text-[10px] text-text-muted font-medium">
                                    <span>No pain</span>
                                    <span>Mild</span>
                                    <span>Moderate</span>
                                    <span>Severe</span>
                                    <span>Worst</span>
                                </div>
                            </div>
                        </div>

                        {/* Baby face scale */}
                        <div className="flex justify-between px-2 mb-2">
                            {DISTRESS_SCALE.map((s, i) => (
                                <div key={i} className={`flex flex-col items-center gap-1 transition-all ${distressLevel >= s.min && distressLevel <= s.max ? "scale-125" : "opacity-50"}`}>
                                    <span className="text-2xl">{s.emoji}</span>
                                    <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.min === s.max ? s.min : `${s.min}-${s.max}`}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── 2. Need Prediction Bars (unified — adapts heading per modality) ── */}
                    {result.all_needs && (
                        <div className="card-soft p-6 sm:p-8">
                            <p className="text-sm font-bold text-text-primary mb-1 font-[family-name:var(--font-sans)]">
                                {result.type === "face" ? "Face-Based Need Prediction" : "Cry Analysis"}
                            </p>
                            <p className="text-xs text-text-muted mb-4">
                                {result.type === "face"
                                    ? "Predicted using facial expression AI — for best accuracy, also record audio"
                                    : "Predicted from audio cry patterns using AI"}
                            </p>
                            <div className="space-y-3">
                                {Object.entries(result.all_needs)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([label, score]) => {
                                        const pct = Math.round(score * 100);
                                        const color = NEED_COLORS[label as NeedLabel] || "#9CA3AF";
                                        const emoji = NEED_EMOJI[label as NeedLabel] || "";
                                        const isTop = label === result.need_label;
                                        return (
                                            <div key={label} className={`flex items-center gap-3 ${isTop ? "" : "opacity-75"}`}>
                                                <span className="w-20 text-sm font-semibold text-text-primary capitalize flex items-center gap-1.5">
                                                    {emoji} {label}
                                                </span>
                                                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                                                    <div
                                                        className="h-full rounded-lg flex items-center transition-all duration-700"
                                                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                                                    >
                                                        <span className="text-white text-xs font-bold ml-2 whitespace-nowrap drop-shadow-sm">
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* ── 2b. Expression tag (FER model) ─────────── */}
                    {result.expression && (
                        <div className="card-soft p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                <span className="text-xl">
                                    {result.expression === "happy" ? "😊" : result.expression === "sad" ? "😢" : result.expression === "angry" ? "😠" : result.expression === "fear" ? "😰" : result.expression === "disgust" ? "🤢" : result.expression === "surprise" ? "😮" : "😐"}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-text-primary capitalize font-[family-name:var(--font-sans)]">
                                    Expression: {result.expression}
                                </p>
                                <p className="text-xs text-text-muted">
                                    Detected by AI facial expression model{result.expression_confidence ? ` (${Math.round(result.expression_confidence * 100)}% confidence)` : ""}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── 2d. Top blendshape activations ───────────── */}
                    {result.type === "face" && result.stress_features && Object.keys(result.stress_features).length > 0 && (
                        <div className="card-soft p-6 sm:p-8">
                            <p className="text-sm font-bold text-text-primary mb-1 font-[family-name:var(--font-sans)]">
                                Active Facial Action Units
                            </p>
                            <p className="text-xs text-text-muted mb-4">ML-detected muscle activations (from neural network)</p>
                            <div className="space-y-2.5">
                                {Object.entries(result.stress_features)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([label, score]) => {
                                        const pct = Math.round(score * 100);
                                        return (
                                            <div key={label} className="flex items-center gap-3">
                                                <span className="w-40 text-xs font-semibold text-text-secondary">
                                                    {label.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                                                </span>
                                                <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
                                                    <div
                                                        className="h-full rounded-md transition-all duration-700"
                                                        style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: pct > 50 ? "#8B5CF6" : pct > 25 ? "#A78BFA" : "#C4B5FD" }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-text-muted w-10 text-right">{pct}%</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* ── 3. Actionable Advice Card ──────────────────── */}
                    {advice && (
                        <div className="card-soft p-6 sm:p-8 border-l-4" style={{ borderLeftColor: distressInfo.color }}>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${distressInfo.color}15` }}>
                                    <Lightbulb className="w-5 h-5" style={{ color: distressInfo.color }} />
                                </div>
                                <div>
                                    <p className="font-bold text-text-primary mb-1 font-[family-name:var(--font-sans)]">
                                        {advice.icon} {advice.title}
                                    </p>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        {advice[severity]}
                                    </p>
                                    {result.secondary_need && (
                                        <p className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            Also consider: <span className="font-semibold capitalize">{result.secondary_need}</span> — {NEED_ADVICE[result.secondary_need as NeedLabel]?.low || ""}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 4. Cross-modality prompt / Fusion weights ───── */}
                    {result.type === "face" && (
                        <div className="card-soft p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/40 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <Volume2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-blue-900 mb-0.5">Boost accuracy with audio</p>
                                <p className="text-xs text-blue-700">
                                    Combine face analysis with cry recording for the most accurate need prediction.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    // Store the face result for combined analysis
                                    if (result.raw) {
                                        faceResultRef.current = result.raw as unknown as AnalyzeImageResult;
                                    }
                                    setCombinedMode(true);
                                    setActiveTab("audio");
                                    setResult(null);
                                    setError(null);
                                    setSaved(false);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shrink-0"
                            >
                                Record Now
                            </button>
                        </div>
                    )}

                    {/* Fusion weights badge (shown for combined results) */}
                    {result.fusion_weights && (
                        <div className="card-soft p-4 flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/40">
                            <span className="text-lg">🔗</span>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-indigo-900 mb-1">Multimodal Fusion</p>
                                <div className="flex gap-3 text-[11px] font-semibold text-indigo-700">
                                    {result.fusion_weights.audio > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-100">🎙️ Audio {Math.round((result.fusion_weights.audio as number) * 100)}%</span>
                                    )}
                                    {result.fusion_weights.face > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-purple-100">👶 Face {Math.round((result.fusion_weights.face as number) * 100)}%</span>
                                    )}
                                    {result.fusion_weights.context > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-violet-100">📋 Context {Math.round((result.fusion_weights.context as number) * 100)}%</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 5. Feedback + Save ─────────────────────────── */}
                    <div className="card-soft p-6 sm:p-8">
                        {/* Were we right? */}
                        {!feedbackGiven && (
                            <div className="mb-5 pb-5 border-b border-primary-100/50">
                                <p className="text-sm font-bold text-text-primary mb-3 text-center font-[family-name:var(--font-sans)]">
                                    Were we right?
                                </p>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => setFeedbackGiven(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                                    >
                                        <ThumbsUp className="w-4 h-4" /> Yes!
                                    </button>
                                    <button
                                        onClick={() => setFeedbackGiven(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                                    >
                                        <ThumbsDown className="w-4 h-4" /> Not quite
                                    </button>
                                </div>
                            </div>
                        )}
                        {feedbackGiven && (
                            <div className="mb-5 pb-5 border-b border-primary-100/50 text-center">
                                <p className="text-sm text-text-muted">Thanks for the feedback! This helps Kynari learn. 💜</p>
                            </div>
                        )}

                        {/* Save to timeline */}
                        <div className="flex items-center gap-3">
                            {!saved ? (
                                <button
                                    onClick={handleSave}
                                    disabled={!selectedChild}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-4 h-4" />
                                    Save to Timeline
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 text-primary-700">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm font-semibold">Saved to timeline!</span>
                                </div>
                            )}
                            {!saved && selectedChild && (
                                <span className="text-xs text-text-muted">
                                    Saving for {children?.find((c) => c.id === selectedChild)?.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
