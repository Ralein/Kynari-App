"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { EMOTION_COLORS, EMOTION_EMOJI, type EmotionLabel } from "@kynari/shared";

interface EmotionPieChartProps {
    distribution: Record<string, number>;
}

export function EmotionPieChart({ distribution }: EmotionPieChartProps) {
    const data = Object.entries(distribution)
        .filter(([, value]) => value > 0)
        .map(([emotion, value]) => ({
            name: emotion,
            value: Math.round(value * 10) / 10,
            emoji: EMOTION_EMOJI[emotion as EmotionLabel] ?? "❓",
            color: EMOTION_COLORS[emotion as EmotionLabel] ?? "#9CA3AF",
        }))
        .sort((a, b) => b.value - a.value);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-text-muted text-sm">
                No emotion data available
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((entry) => (
                                <Cell
                                    key={entry.name}
                                    fill={entry.color}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [
                                `${value}%`,
                                `${EMOTION_EMOJI[String(name) as EmotionLabel] ?? ""} ${name}`,
                            ]}
                            contentStyle={{
                                borderRadius: "12px",
                                border: "1px solid #e7e5e4",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                fontSize: "13px",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-text-secondary">
                            {item.emoji} {item.name}
                        </span>
                        <span className="text-sm font-medium text-text-primary ml-auto">
                            {item.value}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
