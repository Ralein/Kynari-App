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

import type { HourlyGroup } from "@kynari/shared";

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


// ─── Playbook (Care Playbook) API ───────────────────────────

export interface PlaybookTechnique {
    technique_id: string;
    name: string;
    description: string;
    icon: string;
    steps: string[];
    timer_seconds: number | null;
    success_rate: number | null;
    total_feedback: number;
}

export interface PlaybookPlanResult {
    need: string;
    confidence: number;
    techniques: PlaybookTechnique[];
    personalised: boolean;
}

export interface PlaybookFeedbackPayload {
    child_id: string;
    need: string;
    technique_id: string;
    outcome: "success" | "fail";
    notes?: string;
    duration_seconds?: number;
}

export async function getPlaybookPlan(
    token: string,
    childId: string,
    need: string,
    confidence: number = 0.0
): Promise<PlaybookPlanResult> {
    return apiFetch<PlaybookPlanResult>(
        `/api/playbook/plan?child_id=${childId}&need=${need}&confidence=${confidence}`,
        { token }
    );
}

export async function submitPlaybookFeedback(
    token: string,
    feedback: PlaybookFeedbackPayload
): Promise<{ success: boolean; feedback_id: string; message: string }> {
    return apiFetch(`/api/playbook/feedback`, {
        token,
        method: "POST",
        body: JSON.stringify(feedback),
    });
}

export async function getPlaybookStats(
    token: string,
    childId: string
): Promise<{ child_id: string; total_feedback: number; techniques: unknown[] }> {
    return apiFetch(`/api/playbook/stats/${childId}`, { token });
}


// ─── Soundscape API ─────────────────────────────────────────

export interface SoundscapeProfile {
    id: string;
    name: string;
    description: string;
    pink_noise: number;
    nature: number;
    piano: number;
    shush: number;
    heartbeat: number;
    icon: string;
}

export interface SoundscapePreferences {
    child_id: string;
    default_profile: string;
    auto_adapt: boolean;
    nature_sound: string;
    updated_at?: string;
}

export async function getSoundscapeProfiles(token: string): Promise<SoundscapeProfile[]> {
    return apiFetch<SoundscapeProfile[]>(`/api/soundscape/profiles`, { token });
}

export async function getSoundscapePreferences(
    token: string,
    childId: string
): Promise<SoundscapePreferences> {
    return apiFetch<SoundscapePreferences>(`/api/soundscape/preferences/${childId}`, { token });
}

export async function saveSoundscapePreferences(
    token: string,
    prefs: { child_id: string; default_profile: string; auto_adapt: boolean; nature_sound: string }
): Promise<SoundscapePreferences> {
    return apiFetch<SoundscapePreferences>(`/api/soundscape/preferences`, {
        token,
        method: "POST",
        body: JSON.stringify(prefs),
    });
}

export async function logSoundscapeSession(
    token: string,
    session: {
        child_id: string;
        started_at: string;
        duration_minutes: number;
        avg_distress: number;
        profile_used: string;
        auto_adapt_used: boolean;
    }
): Promise<unknown> {
    return apiFetch(`/api/soundscape/session-end`, {
        token,
        method: "POST",
        body: JSON.stringify(session),
    });
}


// ─── Voice Lullaby API ──────────────────────────────────────

export interface VoiceInfo {
    voice_id: string;
    name: string;
    gender: string;
    style: string;
    description: string;
}

export interface LullabyInfo {
    id: string;
    title: string;
    lyrics: string;
    mood: string;
    origin: string;
    duration_estimate: number;
}

export async function getVoices(token: string): Promise<VoiceInfo[]> {
    return apiFetch<VoiceInfo[]>(`/api/voice/voices`, { token });
}

export async function getVoicePreference(
    token: string
): Promise<{ parent_id: string; selected_voice: string; label: string }> {
    return apiFetch(`/api/voice/preference`, { token });
}

export async function saveVoicePreference(
    token: string,
    selectedVoice: string,
    label: string = "Default"
): Promise<unknown> {
    return apiFetch(`/api/voice/preference`, {
        token,
        method: "POST",
        body: JSON.stringify({ selected_voice: selectedVoice, label }),
    });
}

export async function getLullabies(
    token: string,
    mood?: string
): Promise<LullabyInfo[]> {
    const url = mood ? `/api/voice/lullabies?mood=${mood}` : `/api/voice/lullabies`;
    return apiFetch<LullabyInfo[]>(url, { token });
}

export function generateLullabyUrl(token: string, voiceId: string, lullabyId: string): string {
    // For audio element src — returns the streaming endpoint URL
    return `${API_BASE}/api/voice/generate`;
}

export async function generateLullabyBlob(
    token: string,
    voiceId: string,
    lullabyId: string
): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/voice/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voice_id: voiceId, lullaby_id: lullabyId }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `TTS generation failed: ${res.status}`);
    }
    return res.blob();
}


// ─── Story Book API ─────────────────────────────────────────

export interface BookPage {
    page_number: number;
    text: string;
    image_prompt?: string;
    image_url?: string;
}

export interface BookResponse {
    id: string;
    title: string;
    theme: string;
    style: string;
    child_name?: string;
    pages: BookPage[];
    status: string;
    created_at?: string;
}

export interface BookListItem {
    id: string;
    title: string;
    theme: string;
    style: string;
    child_name?: string;
    page_count: number;
    status: string;
    created_at?: string;
}

export async function generateBook(
    token: string,
    params: { child_id?: string; child_name: string; theme: string; style: string }
): Promise<BookResponse> {
    return apiFetch<BookResponse>(`/api/books/generate`, {
        token,
        method: "POST",
        body: JSON.stringify(params),
    });
}

export async function listBooks(token: string): Promise<BookListItem[]> {
    return apiFetch<BookListItem[]>(`/api/books/`, { token });
}

export async function getBook(token: string, bookId: string): Promise<BookResponse> {
    return apiFetch<BookResponse>(`/api/books/${bookId}`, { token });
}

export async function deleteBook(token: string, bookId: string): Promise<void> {
    await apiFetch(`/api/books/${bookId}`, { token, method: "DELETE" });
}


// ─── Memory Garden API ──────────────────────────────────────

export interface Milestone {
    id: string;
    child_id: string;
    type: string;
    title: string;
    description?: string;
    caption?: string;
    detected_at?: string;
    source: string;
}

export interface WeeklyNarrative {
    id: string;
    child_id: string;
    week_start: string;
    week_end: string;
    narrative: string;
    analysis_count: number;
    playbook_count: number;
    created_at?: string;
}

export interface MemoryGardenData {
    child_id: string;
    milestones: Milestone[];
    narratives: WeeklyNarrative[];
    total_milestones: number;
    total_narratives: number;
}

export async function getMemoryGarden(token: string, childId: string): Promise<MemoryGardenData> {
    return apiFetch<MemoryGardenData>(`/api/memory/garden/${childId}`, { token });
}

export async function createMilestone(
    token: string,
    params: { child_id: string; type: string; title: string; description?: string }
): Promise<Milestone> {
    return apiFetch<Milestone>(`/api/memory/milestones`, {
        token,
        method: "POST",
        body: JSON.stringify(params),
    });
}

export async function deleteMilestone(
    token: string,
    milestoneId: string,
    childId: string
): Promise<void> {
    await apiFetch(`/api/memory/milestones/${milestoneId}?child_id=${childId}`, {
        token,
        method: "DELETE",
    });
}


// ─── Voice Speak API (Story Book Read Aloud) ────────────────

export async function speakText(
    token: string,
    voiceId: string,
    text: string
): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/voice/speak`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voice_id: voiceId, text }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `TTS speak failed: ${res.status}`);
    }
    return res.blob();
}

