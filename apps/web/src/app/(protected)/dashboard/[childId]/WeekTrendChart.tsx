"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { EMOTION_LABELS, type DailySummary } from "@kynari/shared";

const SOFT_EMOTION_COLORS: Record<string, string> = {
    happy: "#86efac",
    sad: "#93c5fd",
    angry: "#fca5a5",
    fearful: "#c4b5fd",
    neutral: "#cbd5e1",
    frustrated: "#fdba74",
};

interface WeekTrendChartProps {
    summaries: DailySummary[];
}

export function WeekTrendChart({ summaries }: WeekTrendChartProps) {
    if (summaries.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-text-muted text-sm">
                No weekly data available yet. Check back after a few days of monitoring.
            </div>
        );
    }

    const data = summaries.map((s) => {
        const day = new Date(s.date).toLocaleDateString("en-US", {
            weekday: "short",
        });
        const entry: Record<string, string | number> = { day, date: s.date };
        for (const emotion of EMOTION_LABELS) {
            entry[emotion] = s.emotion_distribution[emotion] ?? 0;
        }
        return entry;
    });

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                >
                    <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: "#9f99b3" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "#9f99b3" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: "14px",
                            border: "1px solid #e9d5ff",
                            boxShadow: "0 4px 16px rgba(147,51,234,0.08)",
                            fontSize: "13px",
                            fontFamily: "var(--font-body)",
                        }}
                        formatter={(value, name) => [
                            `${Math.round(Number(value))}%`,
                            String(name),
                        ]}
                    />
                    {[...EMOTION_LABELS].reverse().map((emotion) => (
                        <Area
                            key={emotion}
                            type="monotone"
                            dataKey={emotion}
                            stackId="1"
                            stroke={SOFT_EMOTION_COLORS[emotion] ?? "#cbd5e1"}
                            fill={SOFT_EMOTION_COLORS[emotion] ?? "#cbd5e1"}
                            fillOpacity={0.6}
                            strokeWidth={0}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
