import { RiVolumeMuteLine, RiBrainLine, RiShieldLine, RiShieldKeyholeLine } from "react-icons/ri";

export function PrivacyFooter() {
    return (
        <section className="py-16 text-center">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
                {[
                    { icon: RiVolumeMuteLine, label: "Zero audio storage" },
                    { icon: RiBrainLine, label: "On-device AI" },
                    { icon: RiShieldLine, label: "COPPA compliant" },
                    { icon: RiShieldKeyholeLine, label: "End-to-end encrypted" },
                ].map(({ icon: Icon, label }) => (
                    <span key={label} className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-emerald-500" />
                        {label}
                    </span>
                ))}
            </div>
        </section>
    );
}
