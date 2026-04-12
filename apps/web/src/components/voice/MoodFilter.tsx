"use client";

interface MoodChip {
    id: string;
    label: string;
    color: string;
}

interface MoodFilterProps {
    chips: MoodChip[];
    activeMood: string;
    onSelectMood: (mood: string) => void;
}

export function MoodFilter({ chips, activeMood, onSelectMood }: MoodFilterProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {chips.map((chip) => (
                <button
                    key={chip.id}
                    onClick={() => onSelectMood(chip.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        activeMood === chip.id
                            ? "text-white shadow-sm"
                            : "bg-white/70 text-slate-500 border border-white/80 hover:bg-white/90"
                    }`}
                    style={activeMood === chip.id ? { backgroundColor: chip.color } : undefined}
                >
                    {chip.label}
                </button>
            ))}
        </div>
    );
}
