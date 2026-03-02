// ─── Emotion Types ──────────────────────────────────────────
export type EmotionLabel =
    | "happy"
    | "sad"
    | "angry"
    | "fearful"
    | "neutral"
    | "frustrated";

export type Modality = "voice" | "face" | "combined";

// ─── Core Event Schema ──────────────────────────────────────
// The ONLY data that ever leaves the device.
export interface EmotionEvent {
    child_id: string;
    timestamp: string; // ISO 8601
    emotion_label: EmotionLabel;
    confidence: number; // 0–1
    modality: Modality;
    session_id: string;
}

// ─── Child Profile ──────────────────────────────────────────
export interface Child {
    id: string;
    name: string;
    date_of_birth: string; // ISO 8601 date
    created_at: string;
    parent_id: string;
    avatar_url?: string | null;
}

export interface ChildCreate {
    name: string;
    date_of_birth: string;
    avatar_url?: string | null;
}

// ─── Daily Summary ──────────────────────────────────────────
export interface DailySummary {
    child_id: string;
    date: string; // YYYY-MM-DD
    dominant_emotion: EmotionLabel;
    emotion_distribution: Record<EmotionLabel, number>; // percentages 0–100
    total_events: number;
    baseline_deviation: number | null; // z-score, null if baseline not formed yet
    insight_text: string; // e.g. "More frustrated than usual around 5–6pm"
}

// ─── Baseline ───────────────────────────────────────────────
export interface ChildBaseline {
    child_id: string;
    emotion: EmotionLabel;
    mean_frequency: number; // avg events per hour
    std_deviation: number;
    calibration_complete: boolean;
    days_of_data: number;
    last_updated: string;
}

// ─── API Response Types ─────────────────────────────────────
export interface BatchEventsRequest {
    child_id: string;
    session_id: string;
    events: Omit<EmotionEvent, "child_id" | "session_id">[];
}

export interface BatchEventsResponse {
    received: number;
    session_id: string;
    status: "ok";
}

export interface BaselineStatus {
    calibration_complete: boolean;
    days_of_data: number;
    days_remaining: number;
}

export interface HourlyGroup {
    hour: number;
    events: EmotionEvent[];
    dominant_emotion: EmotionLabel;
}

// ─── Emotion Metadata ───────────────────────────────────────
export const EMOTION_EMOJI: Record<EmotionLabel, string> = {
    happy: "😄",
    sad: "😢",
    angry: "😠",
    fearful: "😨",
    neutral: "😐",
    frustrated: "😤",
};

export const EMOTION_LABELS: EmotionLabel[] = [
    "happy",
    "sad",
    "angry",
    "fearful",
    "neutral",
    "frustrated",
];

export const EMOTION_COLORS: Record<EmotionLabel, string> = {
    happy: "#34D399",
    sad: "#60A5FA",
    angry: "#F87171",
    fearful: "#A78BFA",
    neutral: "#9CA3AF",
    frustrated: "#FB923C",
};
