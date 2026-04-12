"use client";

import { type SoundscapeProfile } from "@/lib/api";

interface ProfileSelectorProps {
    profiles: SoundscapeProfile[];
    activeProfile: string;
    onSelectProfile: (profileId: string) => void;
}

export function ProfileSelector({ profiles, activeProfile, onSelectProfile }: ProfileSelectorProps) {
    return (
        <div className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl p-6">
            <h2 className="text-base font-bold font-[family-name:var(--font-sans)] text-[#1a1b2e] mb-4">
                Sound Profile
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {profiles.map((profile) => (
                    <button
                        key={profile.id}
                        onClick={() => onSelectProfile(profile.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ${
                            activeProfile === profile.id
                                ? "bg-[#EAE2FB] border-[#6B48C8]/30 shadow-sm"
                                : "bg-white/50 border-white/80 hover:bg-white/80"
                        }`}
                    >
                        <span className="text-2xl">{profile.icon}</span>
                        <span className={`text-xs font-semibold ${
                            activeProfile === profile.id ? "text-[#6B48C8]" : "text-[#4a4b5e]"
                        }`}>
                            {profile.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
