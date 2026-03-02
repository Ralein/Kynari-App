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
