"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useToken, useChildren } from "@/lib/hooks";
import {
    analyzeImage,
    analyzeAudio,
    analyzeVideo,
    saveAnalysisResult,
} from "@/lib/api";
import { EMOTION_EMOJI } from "@kynari/shared";
import { Camera, Mic, Upload, ChevronRight, Save, CheckCircle2, AlertCircle } from "lucide-react";

type Tab = "camera" | "audio" | "upload";

type AnalysisResult = {
    type: "face" | "audio" | "video";
    emotion_label: string;
    confidence: number;
    all_emotions?: Record<string, number>;
    all_classes?: Record<string, number>;
    cry_reason?: string;
    cry_description?: string;
    raw?: Record<string, unknown>;
};

export default function AnalyzePage() {
    const token = useToken();
    const { data: children } = useChildren();
    const [activeTab, setActiveTab] = useState<Tab>("camera");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedChild, setSelectedChild] = useState<string>("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (children?.length && !selectedChild) {
            setSelectedChild(children[0].id);
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
                        emotion_label: res.emotion_label!,
                        confidence: res.confidence!,
                        all_emotions: res.all_emotions,
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

                try {
                    const file = new File([blob], "recording.webm", { type: "audio/webm" });
                    const res = await analyzeAudio(token, file);
                    if (res.success) {
                        setResult({
                            type: "audio",
                            emotion_label: res.emotion_label!,
                            confidence: res.confidence!,
                            all_classes: res.all_classes,
                            cry_reason: res.cry_reason,
                            cry_description: res.cry_description,
                            raw: res as unknown as Record<string, unknown>,
                        });
                    } else {
                        setError(res.message || "Audio analysis failed");
                    }
                } catch {
                    setError("Failed to connect to analysis server");
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
    }, [token]);

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

            try {
                if (file.type.startsWith("image/")) {
                    const res = await analyzeImage(token, file);
                    if (res.success) {
                        setResult({
                            type: "face",
                            emotion_label: res.emotion_label!,
                            confidence: res.confidence!,
                            all_emotions: res.all_emotions,
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
                            emotion_label: res.emotion_label!,
                            confidence: res.confidence!,
                            all_classes: res.all_classes,
                            cry_reason: res.cry_reason,
                            cry_description: res.cry_description,
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
                            emotion_label: res.emotion_label!,
                            confidence: res.confidence!,
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
        try {
            await saveAnalysisResult(token, {
                child_id: selectedChild,
                emotion_label: result.emotion_label,
                confidence: result.confidence,
                modality: result.type === "face" ? "face" : result.type === "audio" ? "voice" : "combined",
                raw_result: result.raw,
            });
            setSaved(true);
        } catch {
            setError("Failed to save result");
        }
    }, [result, token, selectedChild]);

    useEffect(() => {
        return () => {
            stopCamera();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [stopCamera]);

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
                    Analyze Baby Emotion
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                    Scan your baby&apos;s face, record their sounds, or upload a file to understand their emotions
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
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                            />
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
                                <button onClick={startCamera} className="btn-primary">
                                    <Camera className="w-4 h-4" />
                                    Start Camera
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={captureAndAnalyze}
                                        disabled={isAnalyzing}
                                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAnalyzing ? "Analyzing..." : "Capture & Analyze"}
                                    </button>
                                    <button
                                        onClick={stopCamera}
                                        className="btn-secondary"
                                    >
                                        Stop Camera
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Audio Tab */}
                {activeTab === "audio" && (
                    <div className="space-y-4">
                        <div className="bg-gray-900 rounded-2xl p-8 max-w-xl mx-auto flex flex-col items-center">
                            <div
                                className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${isRecording
                                    ? "bg-red-500/20 animate-pulse"
                                    : "bg-white/10"
                                    }`}
                            >
                                <Mic className={`w-10 h-10 ${isRecording ? "text-red-400" : "text-white/50"}`} />
                            </div>
                            {isRecording && (
                                <p className="text-white/80 text-sm mb-2 font-medium">
                                    Recording... {recordingTime}s / 10s
                                </p>
                            )}
                            <p className="text-white/50 text-xs text-center">
                                {isRecording
                                    ? "Recording will auto-stop at 10 seconds"
                                    : "Hold your phone near your baby to capture their sounds"}
                            </p>
                        </div>
                        <div className="flex justify-center">
                            {!isRecording ? (
                                <button
                                    onClick={startRecording}
                                    disabled={isAnalyzing}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    <Mic className="w-4 h-4" />
                                    {isAnalyzing ? "Analyzing..." : "Start Recording"}
                                </button>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
                                >
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
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors max-w-xl mx-auto cursor-pointer ${dragOver
                                ? "border-primary-500 bg-primary-50/50"
                                : "border-primary-200 hover:border-primary-400"
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOver(false);
                                const file = e.dataTransfer.files[0];
                                if (file) handleFile(file);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 text-primary-300 mx-auto mb-3" />
                            <p className="text-text-secondary text-sm font-medium">
                                {isAnalyzing ? "Analyzing..." : "Drag & drop or click to upload"}
                            </p>
                            <p className="text-text-muted text-xs mt-1">
                                Images (JPG, PNG) · Audio (WAV, MP3) · Video (MP4, WebM)
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,audio/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="card-soft p-5 border-l-4 border-red-300 bg-red-50/50 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Results Display */}
            {result && (
                <div className="card-soft p-6 sm:p-8 animate-slide-up">
                    <h3 className="text-lg font-bold mb-4 font-[family-name:var(--font-sans)]">
                        Analysis Result
                    </h3>

                    {/* Main emotion */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
                            <span className="text-4xl">
                                {EMOTION_EMOJI[result.emotion_label as keyof typeof EMOTION_EMOJI] || "🔍"}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-3 py-1 rounded-full text-sm font-bold capitalize bg-primary-100 text-primary-800">
                                    {result.emotion_label}
                                </span>
                                <span className="text-xs text-text-muted">
                                    via {result.type === "face" ? "facial expression" : result.type === "audio" ? "cry analysis" : "combined"}
                                </span>
                            </div>
                            {result.cry_description && (
                                <p className="text-sm text-text-secondary">{result.cry_description}</p>
                            )}
                        </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-text-muted mb-1.5">
                            <span className="font-medium">Confidence</span>
                            <span className="font-semibold">{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-3 bg-primary-50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700"
                                style={{ width: `${result.confidence * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* All emotions breakdown */}
                    {result.all_emotions && (
                        <div className="mb-6 space-y-2">
                            <p className="text-xs text-text-muted font-semibold">All detected emotions</p>
                            {Object.entries(result.all_emotions)
                                .sort(([, a], [, b]) => b - a)
                                .map(([label, score]) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <span className="w-20 text-xs text-text-secondary capitalize">{label}</span>
                                        <div className="flex-1 h-2 bg-primary-50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-300/60 rounded-full"
                                                style={{ width: `${score * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-text-muted w-12 text-right font-medium">
                                            {(score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Cry classes breakdown */}
                    {result.all_classes && (
                        <div className="mb-6 space-y-2">
                            <p className="text-xs text-text-muted font-semibold">Cry classification</p>
                            {Object.entries(result.all_classes)
                                .sort(([, a], [, b]) => b - a)
                                .map(([label, score]) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <span className="w-20 text-xs text-text-secondary capitalize">
                                            {label.replace(/_/g, " ")}
                                        </span>
                                        <div className="flex-1 h-2 bg-primary-50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-sky/60 rounded-full"
                                                style={{ width: `${score * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-text-muted w-12 text-right font-medium">
                                            {(score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Save to timeline */}
                    <div className="flex items-center gap-3 pt-4 border-t border-primary-100/50">
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
            )}
        </div>
    );
}
