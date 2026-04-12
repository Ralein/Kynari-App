"use client";

import { Volume2, Waves, Music, Wind } from "lucide-react";

interface LayerState {
    pinkNoise: number;
    nature: number;
    piano: number;
    shush: number;
}

interface LayerMixerProps {
    layers: LayerState;
    natureSound: string;
    onLayerChange: (key: keyof LayerState, value: number) => void;
}

export function LayerMixer({ layers, natureSound, onLayerChange }: LayerMixerProps) {
    const LAYER_CONFIG = [
        { key: "pinkNoise" as const, label: "Pink Noise", icon: Volume2, color: "#F0897A" },
        { 
            key: "nature" as const, 
            label: natureSound === "none" ? "Nature (off)" : `Nature (${natureSound})`, 
            icon: natureSound === "ocean" ? Waves : natureSound === "rain" ? Waves : Wind, // Placeholder logic for icon
            color: "#93E2FA" 
        },
        { key: "piano" as const, label: "Soft Piano", icon: Music, color: "#6B48C8" },
        { key: "shush" as const, label: "Shush Rhythm", icon: Wind, color: "#B5EAC5" },
    ];

    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
            <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-5">
                Layer Mixer
            </h2>
            <div className="space-y-5">
                {LAYER_CONFIG.map((layer) => {
                    const Icon = layer.icon;
                    const value = layers[layer.key];
                    const pct = Math.round(value * 100);
                    return (
                        <div key={layer.key} className="flex items-center gap-4">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${layer.color}20` }}
                            >
                                <Icon className="w-4.5 h-4.5" style={{ color: layer.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-semibold text-[#1a1b2e]">
                                        {layer.label}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">
                                        {pct}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={pct}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value) / 100;
                                        onLayerChange(layer.key, v);
                                    }}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer px-0"
                                    style={{
                                        background: `linear-gradient(to right, ${layer.color} 0%, ${layer.color} ${pct}%, #E5E7EB ${pct}%, #E5E7EB 100%)`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
