import { RiEmotionHappyLine, RiSparklingLine } from "react-icons/ri";

export function EmotionPreview() {
    return (
        <section className="py-20">
            <div className="bg-gradient-to-br from-[#EAE2FB]/60 to-[#FCECD8]/60 border border-white/80 backdrop-blur-sm rounded-3xl p-10 md:p-14 max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-sans)]">
                        What parents see
                    </h2>
                    <p className="mt-3 text-[#4a4b5e]">
                        A daily emotional snapshot — personalized after 7 days.
                    </p>
                </div>

                {/* Mock Insight Card */}
                <div className="bg-white/80 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] rounded-2xl p-6 max-w-md mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F0897A] to-[#EFA192] flex items-center justify-center text-white font-bold text-sm">
                            E
                        </div>
                        <div>
                            <p className="font-bold text-sm">Emma, 3 years old</p>
                            <p className="text-slate-400 text-xs">Today&apos;s Summary</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <RiEmotionHappyLine className="w-6 h-6 text-emerald-500" />
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                            Happy
                        </span>
                        <span className="text-slate-400 text-xs ml-auto">Dominant today</span>
                    </div>

                    {/* Emotion Bar */}
                    <div className="flex rounded-full overflow-hidden h-3 mb-4">
                        <div className="bg-emerald-400" style={{ width: "45%" }} />
                        <div className="bg-slate-300" style={{ width: "25%" }} />
                        <div className="bg-[#F3A595]" style={{ width: "15%" }} />
                        <div className="bg-blue-300" style={{ width: "10%" }} />
                        <div className="bg-yellow-300" style={{ width: "5%" }} />
                    </div>

                    <div className="flex items-start gap-2">
                        <RiSparklingLine className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-[#4a4b5e] leading-relaxed">
                            A great day overall! More playful than usual, especially
                            between 10am–12pm. Slight frustration around snack time.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
