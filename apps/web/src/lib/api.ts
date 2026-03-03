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

export async function getEventsByDate(
    token: string,
    childId: string,
    date: string
): Promise<EmotionEvent[]> {
    return apiFetch<EmotionEvent[]>(`/events/${childId}?date=${date}`, { token });
}

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

export interface WeeklyReport {
    narrative: string;
    week_start: string;
    generated_at: string;
    cached: boolean;
}

export async function getAIWeeklyReport(
    token: string,
    childId: string,
    weekStart?: string
): Promise<WeeklyReport> {
    const params = weekStart ? `?week_start=${weekStart}` : "";
    return apiFetch<WeeklyReport>(
        `/summaries/${childId}/ai-report${params}`,
        { token }
    );
}

// ─── Analyze API ────────────────────────────────────────────

export interface AnalyzeImageResult {
    success: boolean;
    modality?: string;
    distress_score?: number;
    distress_intensity?: string;
    stress_features?: Record<string, number>;
    faces_detected?: number;
    error?: string;
    message?: string;
}

export interface AnalyzeAudioResult {
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

export interface AnalyzeVideoResult {
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

export interface SaveResultResponse {
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
