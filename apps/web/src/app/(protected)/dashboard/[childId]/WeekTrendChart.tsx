"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { EMOTION_COLORS, EMOTION_LABELS, type DailySummary } from "@kynari/shared";

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

    // Transform summaries into chart data
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
                        tick={{ fontSize: 12, fill: "#a8a29e" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "#a8a29e" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid #e7e5e4",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            fontSize: "13px",
                        }}
                        formatter={(value, name) => [
                            `${Math.round(Number(value))}%`,
                            String(name),
                        ]}
                    />
                    {/* Render stacked areas — "quietest" emotions at bottom */}
                    {[...EMOTION_LABELS].reverse().map((emotion) => (
                        <Area
                            key={emotion}
                            type="monotone"
                            dataKey={emotion}
                            stackId="1"
                            stroke={EMOTION_COLORS[emotion]}
                            fill={EMOTION_COLORS[emotion]}
                            fillOpacity={0.6}
                            strokeWidth={0}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
