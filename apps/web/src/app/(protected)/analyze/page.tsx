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
import {
    Camera, Mic, Upload, ChevronRight,
    AlertCircle, Lightbulb, Scan, WifiOff,
    ScanFace, RefreshCcw, Link2,
} from "lucide-react";
import { AnalyzingOverlay } from "@/components/analyze/AnalyzingOverlay";

type Tab = "camera" | "audio" | "upload";

import { AnalysisResultCard, type AnalysisResult } from "@/components/analyze/AnalysisResultCard";





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
            const timer = setTimeout(() => setSelectedChild(children[0].id), 0);
            return () => clearTimeout(timer);
        }
    }, [children, selectedChild]);

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "camera", label: "Scan Face", icon: <Camera className="w-4 h-4" /> },
        { key: "audio", label: "Record Audio", icon: <Mic className="w-4 h-4" /> },
        { key: "upload", label: "Upload File", icon: <Upload className="w-4 h-4" /> },
    ];

    // ─── Camera ─────────────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraActive, setCameraActive] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setCameraActive(true);
            setError(null);
        } catch {
            setError("Could not access camera. Please allow camera permissions.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraActive(false);
    }, []);

    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !token) return;
        setIsAnalyzing(true); setResult(null); setError(null); setSaved(false); setFeedbackGiven(false);
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        canvas.toBlob(async (blob) => {
            if (!blob) { setError("Failed to capture image"); setIsAnalyzing(false); return; }
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            try {
                const res = await analyzeImage(token, file);
                if (res.success) {
                    setResult({ type: "face", need_label: res.need_label, need_description: res.need_description, confidence: res.confidence, secondary_need: res.secondary_need, all_needs: res.all_needs, distress_score: res.distress_score, distress_intensity: res.distress_intensity, stress_features: res.stress_features, expression: res.expression, expression_confidence: res.expression_confidence, raw: res as unknown as Record<string, unknown> });
                } else { setError(res.message || "Analysis failed"); }
            } catch { setError("Failed to connect to analysis server"); }
            setIsAnalyzing(false);
        }, "image/jpeg", 0.9);
    }, [token]);

    // ─── Audio ──────────────────────────────────────────────
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
            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                if (timerRef.current) clearInterval(timerRef.current);
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                if (!token) return;
                setIsAnalyzing(true); setResult(null); setError(null); setSaved(false); setFeedbackGiven(false);
                try {
                    const file = new File([blob], "recording.webm", { type: "audio/webm" });
                    if (combinedMode && faceResultRef.current) {
                        const res = await analyzeCombined(token, file, { distress_score: faceResultRef.current.distress_score, distress_intensity: faceResultRef.current.distress_intensity, stress_features: faceResultRef.current.stress_features });
                        if (res.success) { setResult({ type: "video", need_label: res.need_label, need_description: res.need_description, confidence: res.confidence, secondary_need: res.secondary_need, all_needs: res.all_needs, fusion_weights: res.fusion_weights, raw: res as unknown as Record<string, unknown> }); }
                        else { setError(res.message || "Combined analysis failed"); }
                        setCombinedMode(false); faceResultRef.current = null;
                    } else {
                        const res = await analyzeAudio(token, file);
                        if (res.success) { setResult({ type: "audio", need_label: res.need_label, need_description: res.need_description, confidence: res.confidence, secondary_need: res.secondary_need, all_needs: res.all_needs, raw: res as unknown as Record<string, unknown> }); }
                        else { setError(res.message || "Audio analysis failed"); }
                    }
                } catch { setError("Failed to connect to analysis server"); setCombinedMode(false); }
                setIsAnalyzing(false);
            };
            mediaRecorder.start();
            setIsRecording(true); setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
            setTimeout(() => { if (mediaRecorder.state === "recording") { mediaRecorder.stop(); setIsRecording(false); } }, 10000);
        } catch { setError("Could not access microphone. Please allow microphone permissions."); }
    }, [token, combinedMode]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.stop(); setIsRecording(false); }
    }, []);

    // ─── File upload ─────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = useCallback(async (file: File) => {
        if (!token) return;
        setIsAnalyzing(true); setResult(null); setError(null); setSaved(false); setFeedbackGiven(false);
        try {
            if (file.type.startsWith("image/")) {
                const res = await analyzeImage(token, file);
                if (res.success) { setResult({ type: "face", need_label: res.need_label, need_description: res.need_description, confidence: res.confidence, secondary_need: res.secondary_need, all_needs: res.all_needs, distress_score: res.distress_score, distress_intensity: res.distress_intensity, stress_features: res.stress_features, expression: res.expression, expression_confidence: res.expression_confidence, raw: res as unknown as Record<string, unknown> }); }
                else { setError(res.message || "Image analysis failed"); }
            } else if (file.type.startsWith("audio/")) {
                const res = await analyzeAudio(token, file);
                if (res.success) { setResult({ type: "audio", need_label: res.need_label, need_description: res.need_description, confidence: res.confidence, secondary_need: res.secondary_need, all_needs: res.all_needs, raw: res as unknown as Record<string, unknown> }); }
                else { setError(res.message || "Audio analysis failed"); }
            } else if (file.type.startsWith("video/")) {
                const res = await analyzeVideo(token, file);
                if (res.success) { setResult({ type: "video", need_label: res.need_label, need_description: res.need_description, confidence: res.confidence, secondary_need: res.secondary_need, all_needs: res.all_needs, fusion_weights: res.fusion_weights, raw: res as unknown as Record<string, unknown> }); }
                else { setError(res.message || "Video analysis failed"); }
            } else { setError("Unsupported file type. Please upload an image, audio, or video file."); }
        } catch { setError("Failed to connect to analysis server"); }
        setIsAnalyzing(false);
    }, [token]);

    // ─── Save ────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!result || !token || !selectedChild) return;
        const needLabel = result.need_label || (result.distress_score !== undefined ? (result.distress_score > 0.5 ? "pain" : "calm") : "calm");
        const confidence = result.confidence ?? result.distress_score ?? 0;
        try {
            const res = await saveAnalysisResult(token, { child_id: selectedChild, need_label: needLabel, confidence, modality: result.type === "face" ? "face" : result.type === "audio" ? "voice" : "combined", secondary_need: result.secondary_need, all_needs: result.all_needs, face_distress_score: result.distress_score, raw_result: result.raw });
            if (res.success) { setSaved(true); } else { setError("Failed to save result. Please try again."); }
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to save result"); }
    }, [result, token, selectedChild]);

    useEffect(() => {
        return () => { stopCamera(); if (timerRef.current) clearInterval(timerRef.current); };
    }, [stopCamera]);



    // ─── Error type helpers ───────────────────────────────────
    function getErrorMeta(err: string): { icon: React.ReactNode; title: string; tips: string[] } {
        if (err.includes("face") || err.includes("Face") || err.includes("photo") || err.includes("image") || err.includes("Image")) {
            return {
                icon: <ScanFace className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
                title: "Couldn't detect a face",
                tips: ["Make sure your baby's face is clearly visible and well-lit", "Try moving closer or adjusting the angle", "Avoid blurry photos — hold the camera steady"],
            };
        }
        if (err.includes("audio") || err.includes("Audio") || err.includes("short") || err.includes("record")) {
            return {
                icon: <Mic className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
                title: "Audio issue",
                tips: ["Record for at least 2–3 seconds of your baby's sounds", "Hold your device closer to your baby", "Reduce background noise if possible"],
            };
        }
        if (err.includes("connect") || err.includes("server")) {
            return {
                icon: <WifiOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
                title: "Connection issue",
                tips: ["Check your internet connection and try again"],
            };
        }
        return {
            icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
            title: "Something went wrong",
            tips: [],
        };
    }

    return (
        <div className="animate-fade-in space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Analyze</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)]">Analyze Baby Needs</h1>
                <p className="text-[#4a4b5e] text-sm mt-1">Scan your baby&apos;s face, record their sounds, or upload a file to understand what they need</p>
            </div>

            {/* Child selector */}
            {children && children.length > 1 && (
                <div className="flex items-center gap-3">
                    <label className="text-sm text-[#4a4b5e] font-medium" htmlFor="child-select">Analyzing for:</label>
                    <select id="child-select" value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} className="px-3 py-1.5 rounded-xl border border-[#EAE2FB] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6B48C8]/30 focus:border-[#6B48C8] transition-all">
                        {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 bg-[#EAE2FB] rounded-2xl p-1.5">
                {tabs.map((tab) => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); setResult(null); setError(null); setSaved(false); setFeedbackGiven(false); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.key ? "bg-white shadow-sm text-[#6B48C8] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]" : "text-slate-500 hover:text-[#4a4b5e]"}`}>
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-8">

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
                                <button onClick={startCamera} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)]">
                                    <Camera className="w-4 h-4" /> Start Camera
                                </button>
                            ) : (
                                <>
                                    <button onClick={captureAndAnalyze} disabled={isAnalyzing} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Scan className="w-4 h-4" /> Capture & Analyze
                                    </button>
                                    <button onClick={stopCamera} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 border border-slate-200 text-[#4a4b5e] font-medium hover:bg-white transition-colors">
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
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${isRecording ? "bg-red-500/20 animate-pulse" : "bg-white/10"}`}>
                                <Mic className={`w-10 h-10 ${isRecording ? "text-red-400" : "text-white/50"}`} />
                            </div>
                            {isRecording && <p className="text-white/80 text-sm mb-2 font-medium">Recording… {recordingTime}s / 10s</p>}
                            {combinedMode && !isRecording && (
                                <div className="mb-3 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-indigo-300 shrink-0" />
                                    <p className="text-indigo-300 text-xs font-semibold">Combined Mode — face scan captured, now record audio for fused analysis</p>
                                </div>
                            )}
                            <p className="text-white/50 text-xs text-center">
                                {isRecording ? "Recording will auto-stop at 10 seconds" : "Hold your phone near your baby to capture their sounds"}
                            </p>
                        </div>
                        <div className="flex justify-center">
                            {!isRecording ? (
                                <button onClick={startRecording} disabled={isAnalyzing} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)] disabled:opacity-50">
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
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors max-w-xl mx-auto cursor-pointer ${dragOver ? "border-[#6B48C8] bg-[#EAE2FB]/50" : "border-[#EAE2FB] hover:border-primary-400"}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 text-[#EAE2FB] mx-auto mb-3" />
                            <p className="text-[#4a4b5e] text-sm font-medium">Drag & drop or click to upload</p>
                            <p className="text-slate-500 text-xs mt-1">Images (JPG, PNG) · Audio (WAV, MP3) · Video (MP4, WebM)</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    </div>
                )}
            </div>

            {/* Analyzing Overlay */}
            {isAnalyzing && <AnalyzingOverlay />}

            {/* Error */}
            {error && (() => {
                const { icon, title, tips } = getErrorMeta(error);
                return (
                    <div className="bg-red-50/50 backdrop-blur-sm border border-red-200/60 border-l-4 border-l-red-400 rounded-3xl p-6 animate-fade-in">
                        <div className="flex items-start gap-3">
                            {icon}
                            <div className="flex-1">
                                <p className="font-bold text-red-800 text-sm mb-1">{title}</p>
                                <p className="text-red-700 text-sm mb-3">{error}</p>
                                {tips.length > 0 && (
                                    <ul className="space-y-1 mb-4">
                                        {tips.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                                                <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <button onClick={() => { setError(null); setResult(null); setSaved(false); setFeedbackGiven(false); }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 transition-colors">
                                    <RefreshCcw className="w-3.5 h-3.5" /> Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Results */}
            {result && (
                <AnalysisResultCard
                    result={result}
                    childrenData={children}
                    selectedChild={selectedChild}
                    feedbackGiven={feedbackGiven}
                    setFeedbackGiven={setFeedbackGiven}
                    saved={saved}
                    handleSave={handleSave}
                    onBoostWithAudio={(raw) => {
                        faceResultRef.current = raw as unknown as AnalyzeImageResult;
                        setCombinedMode(true);
                        setActiveTab("audio");
                        setResult(null);
                        setError(null);
                        setSaved(false);
                    }}
                />
            )}
        </div>
    );
}