const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
    token?: string;
}

async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { token, headers, ...rest } = options;

    const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        ...rest,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
}

// ─── Children API ───────────────────────────────────────────

import type { Child, ChildCreate } from "@kynari/shared";

export async function getChildren(token: string): Promise<Child[]> {
    return apiFetch<Child[]>("/children", { token });
}

export async function getChild(
    token: string,
    childId: string
): Promise<Child> {
    return apiFetch<Child>(`/children/${childId}`, { token });
}

export async function createChild(
    token: string,
    data: ChildCreate
): Promise<Child> {
    return apiFetch<Child>("/children", {
        method: "POST",
        body: JSON.stringify(data),
        token,
    });
}

export async function deleteChild(
    token: string,
    childId: string
): Promise<{ deleted: boolean }> {
    return apiFetch<{ deleted: boolean }>(`/children/${childId}`, {
        method: "DELETE",
        token,
    });
}

// ─── Summaries API ──────────────────────────────────────────

import type { DailySummary, BaselineStatus } from "@kynari/shared";

export async function getTodaySummary(
    token: string,
    childId: string
): Promise<DailySummary> {
    return apiFetch<DailySummary>(`/summaries/${childId}/today`, { token });
}

export async function getWeekSummaries(
    token: string,
    childId: string
): Promise<DailySummary[]> {
    return apiFetch<DailySummary[]>(`/summaries/${childId}/week`, { token });
}

export async function getBaselineStatus(
    token: string,
    childId: string
): Promise<BaselineStatus> {
    return apiFetch<BaselineStatus>(`/summaries/${childId}/baseline-status`, {
        token,
    });
}

// ─── Events API ─────────────────────────────────────────────

import type { EmotionEvent, HourlyGroup } from "@kynari/shared";

export async function getTimeline(
    token: string,
    childId: string,
    date: string
): Promise<HourlyGroup[]> {
    return apiFetch<HourlyGroup[]>(`/events/${childId}/timeline?date=${date}`, {
        token,
    });
}

// ─── AI Reports API ─────────────────────────────────────────



// ─── Analyze API ────────────────────────────────────────────

export interface AnalyzeImageResult {
    success: boolean;
    modality?: string;
    distress_score?: number;
    distress_intensity?: string;
    stress_features?: Record<string, number>;
    faces_detected?: number;
    // Need prediction (face-only ML)
    need_label?: string;
    need_description?: string;
    confidence?: number;
    secondary_need?: string;
    all_needs?: Record<string, number>;
    // Expression (FER model)
    expression?: string;
    expression_confidence?: number;
    error?: string;
    message?: string;
}

interface AnalyzeAudioResult {
    success: boolean;
    modality?: string;
    need_label?: string;
    need_description?: string;
    confidence?: number;
    secondary_need?: string;
    all_needs?: Record<string, number>;
    audio_features?: Record<string, number>;
    spectrogram_b64?: string;
    error?: string;
    message?: string;
}

interface AnalyzeVideoResult {
    success: boolean;
    modality?: string;
    need_label?: string;
    need_description?: string;
    confidence?: number;
    secondary_need?: string;
    all_needs?: Record<string, number>;
    fusion_weights?: Record<string, number>;
    audio_analysis?: Record<string, unknown>;
    face_analysis?: Record<string, unknown>;
    frames_analyzed?: number;
    error?: string;
    message?: string;
}

interface SaveResultResponse {
    success: boolean;
    event_id: string;
    session_id: string;
}

export async function analyzeImage(
    token: string,
    file: File
): Promise<AnalyzeImageResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/analyze/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    return res.json();
}

export async function analyzeAudio(
    token: string,
    file: File | Blob
): Promise<AnalyzeAudioResult> {
    const formData = new FormData();
    formData.append("file", file instanceof File ? file : new File([file], "recording.wav", { type: "audio/wav" }));

    const res = await fetch(`${API_BASE}/api/analyze/audio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    return res.json();
}

export async function analyzeVideo(
    token: string,
    file: File
): Promise<AnalyzeVideoResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/analyze/video`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    return res.json();
}

export async function saveAnalysisResult(
    token: string,
    data: {
        child_id: string;
        need_label: string;
        confidence: number;
        modality: string;
        secondary_need?: string;
        all_needs?: Record<string, number>;
        face_distress_score?: number;
        raw_result?: Record<string, unknown>;
    }
): Promise<SaveResultResponse> {
    return apiFetch<SaveResultResponse>("/api/analyze/save", {
        method: "POST",
        body: JSON.stringify(data),
        token,
    });
}

interface CombinedAnalysisResult {
    success: boolean;
    modality?: string;
    need_label?: string;
    need_description?: string;
    confidence?: number;
    secondary_need?: string;
    all_needs?: Record<string, number>;
    fusion_weights?: Record<string, number>;
    audio_analysis?: Record<string, unknown>;
    face_analysis?: Record<string, unknown>;
    spectrogram_b64?: string;
    error?: string;
    message?: string;
}

export async function analyzeCombined(
    token: string,
    audioFile: File | Blob,
    faceResult: {
        distress_score?: number;
        distress_intensity?: string;
        stress_features?: Record<string, number>;
    }
): Promise<CombinedAnalysisResult> {
    const formData = new FormData();
    formData.append("file", audioFile instanceof File ? audioFile : new File([audioFile], "recording.webm", { type: "audio/webm" }));
    formData.append("face_distress_score", String(faceResult.distress_score ?? 0));
    formData.append("face_distress_intensity", faceResult.distress_intensity ?? "mild");
    formData.append("face_stress_features", JSON.stringify(faceResult.stress_features ?? {}));

    const res = await fetch(`${API_BASE}/api/analyze/combined`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    return res.json();
}
