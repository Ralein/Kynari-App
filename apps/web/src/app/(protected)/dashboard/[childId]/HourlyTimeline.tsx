"use client";

import { NEED_EMOJI, type HourlyGroup, type NeedLabel } from "@kynari/shared";

const SOFT_NEED_COLORS: Record<string, string> = {
    hungry: "#fdba74",
    diaper: "#c4b5fd",
    sleepy: "#93c5fd",
    pain: "#fca5a5",
    calm: "#86efac",
};

interface HourlyTimelineProps {
    groups: HourlyGroup[];
}

function formatHour(hour: number): string {
    if (hour === 0) return "12am";
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return "12pm";
    return `${hour - 12}pm`;
}

export function HourlyTimeline({ groups }: HourlyTimelineProps) {
    if (groups.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                No hourly data recorded today
            </div>
        );
    }

    const groupMap = new Map(groups.map((g) => [g.hour, g]));
    const minHour = Math.max(0, Math.min(...groups.map((g) => g.hour)) - 1);
    const maxHour = Math.min(23, Math.max(...groups.map((g) => g.hour)) + 1);

    const hours = Array.from(
        { length: maxHour - minHour + 1 },
        (_, i) => minHour + i
    );

    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {hours.map((hour) => {
                const group = groupMap.get(hour);
                const hasData = !!group;
                const need = group?.dominant_need as NeedLabel | undefined;
                const color = need ? SOFT_NEED_COLORS[need] : undefined;
                const emoji = need ? NEED_EMOJI[need] : undefined;
                const eventCount = group?.events.length ?? 0;

                return (
                    <div
                        key={hour}
                        className="flex flex-col items-center gap-1.5 min-w-[46px]"
                    >
                        {/* Block */}
                        <div
                            className={`relative w-11 h-14 rounded-xl flex items-center justify-center transition-all ${hasData
                                ? "shadow-sm hover:scale-110 cursor-default"
                                : "bg-primary-50/50 border border-primary-100/50"
                                }`}
                            style={
                                hasData
                                    ? {
                                        backgroundColor: `${color}25`,
                                        border: `1px solid ${color}40`,
                                    }
                                    : undefined
                            }
                            title={
                                hasData
                                    ? `${formatHour(hour)}: ${need} (${eventCount} events)`
                                    : formatHour(hour)
                            }
                        >
                            {emoji ? (
                                <span className="text-lg">{emoji}</span>
                            ) : (
                                <span className="text-[10px] text-primary-200">—</span>
                            )}

                            {/* Event count badge */}
                            {eventCount > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                                    style={{ backgroundColor: color }}
                                >
                                    {eventCount}
                                </span>
                            )}
                        </div>

                        {/* Hour label */}
                        <span className="text-[10px] text-text-muted font-medium">
                            {formatHour(hour)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
