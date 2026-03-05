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
    dominant_need: NeedLabel;
    need_distribution: Record<NeedLabel, number>; // percentages 0–100
    total_events: number;
    baseline_deviation: number | null; // z-score, null if baseline not formed yet
    insight_text: string; // e.g. "Baby needed feeding most today"
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
    dominant_need: NeedLabel;
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

// ─── Need Detection Types (Primary System) ──────────────────
export type NeedLabel = "hungry" | "diaper" | "sleepy" | "pain" | "calm";
export type NeedModality = "voice" | "face" | "combined" | "context_only";

export const NEED_EMOJI: Record<NeedLabel, string> = {
    hungry: "🍼",
    diaper: "💩",
    sleepy: "😴",
    pain: "🤕",
    calm: "😌",
};

export const NEED_LABELS: NeedLabel[] = [
    "hungry",
    "diaper",
    "sleepy",
    "pain",
    "calm",
];

export const NEED_COLORS: Record<NeedLabel, string> = {
    hungry: "#FB923C",
    diaper: "#A78BFA",
    sleepy: "#60A5FA",
    pain: "#F87171",
    calm: "#34D399",
};

export const NEED_ADVICE: Record<NeedLabel, { title: string; icon: string; low: string; medium: string; high: string }> = {
    hungry: {
        title: "Hungry",
        icon: "🍼",
        low: "Your baby may be starting to feel hungry. Watch for rooting or hand-to-mouth signals.",
        medium: "Your baby is likely hungry. Try offering a feed — breast or bottle. Check when they last ate.",
        high: "Your baby is showing strong hunger cues! Feed immediately. If breastfeeding, try both sides.",
    },
    diaper: {
        title: "Diaper Change",
        icon: "👶",
        low: "Mild discomfort detected. Quick diaper check recommended.",
        medium: "Your baby may need a diaper change. Check for wetness or soiling.",
        high: "Your baby is very uncomfortable — likely a soiled diaper. Change immediately and check for rash.",
    },
    sleepy: {
        title: "Tired / Sleepy",
        icon: "😴",
        low: "Your baby may be getting drowsy. Start winding down and dimming lights.",
        medium: "Your baby is tired. Try swaddling, rocking, or putting them down for a nap.",
        high: "Your baby is overtired! Move to a quiet, dark room. Gentle rocking and white noise can help.",
    },
    pain: {
        title: "Pain / Discomfort",
        icon: "🤕",
        low: "Mild fussiness detected. Could be gas — try gentle tummy massage or bicycle legs.",
        medium: "Your baby seems to be in discomfort. Try burping, gas drops, or a warm compress on the tummy.",
        high: "Your baby appears to be in significant pain. Check for fever, rash, or swelling. If pain persists, contact your pediatrician.",
    },
    calm: {
        title: "Content / Calm",
        icon: "😌",
        low: "Your baby is content! Great time for tummy time or gentle play.",
        medium: "Your baby seems relaxed. May need burping if fed recently.",
        high: "Your baby is very calm and settled. Enjoy the moment!",
    },
};

export const DISTRESS_SCALE = [
    { min: 0, max: 1, label: "No pain", color: "#22C55E", emoji: "😊" },
    { min: 1, max: 3, label: "Mild", color: "#84CC16", emoji: "🙂" },
    { min: 4, max: 6, label: "Moderate", color: "#EAB308", emoji: "😟" },
    { min: 7, max: 9, label: "Severe", color: "#F97316", emoji: "😰" },
    { min: 10, max: 10, label: "Worst possible", color: "#EF4444", emoji: "😭" },
];

