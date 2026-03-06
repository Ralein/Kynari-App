import { RiMicLine, RiBrainLine, RiBarChart2Line } from "react-icons/ri";

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-20">
            <div className="text-center mb-16 animate-fade-in">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-sans)]">
                    Simple. Private. Insightful.
                </h2>
                <p className="mt-4 text-[#4a4b5e] text-lg max-w-xl mx-auto">
                    Three promises, technically enforced.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                    {
                        icon: RiMicLine,
                        title: "We listen for tone",
                        desc: "Kynari detects emotional prosody — the music of your child's voice — not their words. Think pitch, rhythm, and energy.",
                        gradient: "from-[#EAE2FB] to-[#C9B8F4]",
                    },
                    {
                        icon: RiBrainLine,
                        title: "AI runs on your phone",
                        desc: "All emotion recognition happens on-device using ONNX Runtime. No audio ever leaves your phone. Ever.",
                        gradient: "from-[#A2DDF4]/60 to-[#7BC8EE]/40",
                    },
                    {
                        icon: RiBarChart2Line,
                        title: "Only labels reach us",
                        desc: "We receive tiny data packets — just an emotion label, a confidence score, and a timestamp. That's it.",
                        gradient: "from-[#FCECD8] to-[#F3A595]/40",
                    },
                ].map(({ icon: Icon, title, desc, gradient }) => (
                    <div key={title} className="bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-2xl p-8 group cursor-default">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                            <Icon className="w-6 h-6 text-[#6B48C8]" />
                        </div>
                        <h3 className="text-lg font-bold mb-2 font-[family-name:var(--font-sans)]">{title}</h3>
                        <p className="text-[#4a4b5e] text-sm leading-relaxed">{desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
