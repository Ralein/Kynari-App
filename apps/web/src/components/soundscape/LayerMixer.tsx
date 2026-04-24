"use client";

import { Volume2, Waves, Music, Wind, Activity, Fish, CloudRain, TreePine } from "lucide-react";

interface LayerState {
    pinkNoise: number;
    nature: number;
    piano: number;
    shush: number;
    heartbeat: number;
}

interface LayerMixerProps {
    layers: LayerState;
    natureSound: string;
    onLayerChange: (key: keyof LayerState, value: number) => void;
}

const NATURE_ICON_MAP: Record<string, typeof Waves> = {
    ocean: Waves,
    rain: CloudRain,
    forest: TreePine,
    whale: Fish,
    none: Wind,
};

const LAYER_META = (natureSound: string) => [
    {
        key: "pinkNoise" as const,
        label: "Brown Noise",
        hint: "Deep womb-like masking",
        icon: Volume2,
        from: "#F97B6B",
        to: "#FBAD9E",
    },
    {
        key: "nature" as const,
        label: natureSound === "none" ? "Nature (off)" : `Nature · ${natureSound}`,
        hint: "Ambient environment layer",
        icon: NATURE_ICON_MAP[natureSound] ?? Wind,
        from: "#3EB6E4",
        to: "#93D9F5",
    },
    {
        key: "piano" as const,
        label: "Soft Piano",
        hint: "Gentle pentatonic lullaby",
        icon: Music,
        from: "#8B6CDB",
        to: "#C3AEFF",
    },
    {
        key: "shush" as const,
        label: "Shush Rhythm",
        hint: "Rhythmic white-noise shhh",
        icon: Wind,
        from: "#52C897",
        to: "#A3E8CC",
    },
    {
        key: "heartbeat" as const,
        label: "Heartbeat",
        hint: "65 BPM womb-like pulse",
        icon: Activity,
        from: "#F97B6B",
        to: "#FBAD9E",
    },
];

export function LayerMixer({ layers, natureSound, onLayerChange }: LayerMixerProps) {
    const meta = LAYER_META(natureSound);

    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-[#1a1b2e]">Layer Mixer</h2>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
                    Sound Blend
                </span>
            </div>

            <div className="space-y-6">
                {meta.map((layer) => {
                    const Icon = layer.icon;
                    const value = layers[layer.key];
                    const pct = Math.round(value * 100);
                    const isOff = pct === 0;

                    return (
                        <div
                            key={layer.key}
                            className={`transition-opacity duration-300 ${isOff ? "opacity-40" : "opacity-100"}`}
                        >
                            <div className="flex items-start gap-3.5">
                                {/* Icon pill */}
                                <div
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300"
                                    style={{
                                        background: isOff
                                            ? "#F1F3F5"
                                            : `linear-gradient(135deg, ${layer.from}22, ${layer.to}44)`,
                                        boxShadow: isOff
                                            ? "none"
                                            : `0 2px 10px -2px ${layer.from}55`,
                                    }}
                                >
                                    <Icon
                                        className="w-4 h-4 transition-colors duration-300"
                                        style={{ color: isOff ? "#9CA3AF" : layer.from }}
                                    />
                                </div>

                                {/* Label + slider */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-0.5">
                                        <span className="text-[13px] font-bold text-[#1a1b2e] leading-tight">
                                            {layer.label}
                                        </span>
                                        <span
                                            className="text-[11px] font-bold tabular-nums transition-colors duration-200"
                                            style={{ color: isOff ? "#9CA3AF" : layer.from }}
                                        >
                                            {isOff ? "off" : `${pct}%`}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                                        {layer.hint}
                                    </p>

                                    {/* Custom range slider */}
                                    <div className="relative">
                                        {/* Track background */}
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-150"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: isOff
                                                        ? "#E5E7EB"
                                                        : `linear-gradient(to right, ${layer.from}, ${layer.to})`,
                                                    boxShadow: isOff
                                                        ? "none"
                                                        : `0 1px 6px -1px ${layer.from}80`,
                                                }}
                                            />
                                        </div>

                                        {/* Native range (invisible but functional) */}
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={pct}
                                            onChange={(e) =>
                                                onLayerChange(
                                                    layer.key,
                                                    parseInt(e.target.value) / 100
                                                )
                                            }
                                            className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                                            aria-label={`${layer.label} volume`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Divider + global tip */}
            <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Brown Noise at 50–70 % is the most reliable sleep aid.{" "}
                    <span className="font-semibold text-slate-500">
                        Keep Piano + Shush low until settled.
                    </span>
                </p>
            </div>
        </div>
    );
}
