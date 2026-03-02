"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    getChildren,
    getChild,
    getTodaySummary,
    getWeekSummaries,
    getTimeline,
    getBaselineStatus,
} from "@/lib/api";

// ─── Token Hook ─────────────────────────────────────────────

export function useToken() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            setToken(session?.access_token ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setToken(session?.access_token ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return token;
}

// ─── Children ───────────────────────────────────────────────

export function useChildren() {
    const token = useToken();

    return useSWR(
        token ? ["children", token] : null,
        ([, t]) => getChildren(t),
        { revalidateOnFocus: false }
    );
}

export function useChild(childId: string | undefined) {
    const token = useToken();

    return useSWR(
        token && childId ? ["child", childId, token] : null,
        ([, id, t]) => getChild(t, id),
        { revalidateOnFocus: false }
    );
}

// ─── Summaries ──────────────────────────────────────────────

export function useTodaySummary(childId: string | undefined) {
    const token = useToken();

    return useSWR(
        token && childId ? ["today-summary", childId, token] : null,
        ([, id, t]) => getTodaySummary(t, id),
        { revalidateOnFocus: false }
    );
}

export function useWeekSummaries(childId: string | undefined) {
    const token = useToken();

    return useSWR(
        token && childId ? ["week-summaries", childId, token] : null,
        ([, id, t]) => getWeekSummaries(t, id),
        { revalidateOnFocus: false }
    );
}

// ─── Events ─────────────────────────────────────────────────

export function useTimeline(childId: string | undefined, date: string) {
    const token = useToken();

    return useSWR(
        token && childId ? ["timeline", childId, date, token] : null,
        ([, id, d, t]) => getTimeline(t, id, d),
        { revalidateOnFocus: false }
    );
}

// ─── Baseline ───────────────────────────────────────────────

export function useBaselineStatus(childId: string | undefined) {
    const token = useToken();

    return useSWR(
        token && childId ? ["baseline-status", childId, token] : null,
        ([, id, t]) => getBaselineStatus(t, id),
        { revalidateOnFocus: false }
    );
}
