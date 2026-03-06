import Image from "next/image";
import Link from "next/link";
import {
    RiShieldCheckLine, RiArrowRightLine, RiCloudOffLine, RiCpuLine,
    RiShieldKeyholeLine, RiHeartPulseLine, RiSignalTowerLine, RiWifiLine,
    RiBatteryLine, RiBellLine, RiEmotionHappyLine, RiMoonLine,
    RiSearchEyeLine, RiEmotionUnhappyLine, RiHome4Fill, RiLineChartLine, RiUserLine
} from "react-icons/ri";

export function Hero() {
    return (
        <div className="grid lg:grid-cols-[1fr_auto] gap-16 lg:gap-24 items-center">
            {/* Left Column */}
            <div className="max-w-2xl">
                <div className="animate-fade-in inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/60 text-sm font-medium text-slate-600 mb-8 shadow-sm">
                    <RiShieldCheckLine className="w-4 h-4 text-orange-500" />
                    Privacy-first AI for families
                </div>

                <h1 className="animate-fade-in-delay-1 text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold text-[#1a1b2e] leading-[1.1] tracking-tight mb-6">
                    Your child&apos;s emotional world, made visible.
                </h1>

                <p className="animate-fade-in-delay-2 text-lg md:text-xl text-[#4a4b5e] mb-10 leading-relaxed max-w-xl">
                    Turn toddler meltdowns into moments of connection. Understand the &apos;why&apos; behind the cry with real-time emotional insights. Kynari listens for emotional tone, with absolute privacy on-device.
                </p>

                <div className="animate-fade-in-delay-3 flex flex-col sm:flex-row sm:items-center gap-6 mb-16">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-[#F0897A] to-[#EFA192] text-white font-medium text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_-6px_rgba(240,137,122,0.5)]"
                    >
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3 shadow-sm border border-white/20 p-1">
                            <Image src="/logo1.png" alt="App Icon" width={24} height={24} className="rounded-full w-full h-full object-cover" />
                        </span>
                        Get Started — Free
                    </Link>
                    <a href="#how-it-works" className="text-slate-800 font-medium hover:text-slate-600 transition-colors flex items-center gap-1.5">
                        See how it works
                        <RiArrowRightLine className="w-4 h-4" />
                    </a>
                </div>

                {/* Feature Icons Grid — 4 items */}
                <div className="animate-fade-in-delay-3 grid grid-cols-4 gap-5 max-w-sm">
                    {[
                        { icon: RiCloudOffLine, label: "NO CLOUD\nSTORAGE" },
                        { icon: RiCpuLine, label: "ON-DEVICE\nPROCESSING" },
                        { icon: RiShieldKeyholeLine, label: "END-TO-END\nENCRYPTED" },
                        { icon: RiHeartPulseLine, label: "BUILT FOR\nFAMILIES" },
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex flex-col items-center gap-2.5 group">
                            <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] flex items-center justify-center text-slate-600 group-hover:scale-110 group-hover:shadow-[0_6px_24px_-4px_rgba(240,137,122,0.2)] transition-all duration-300">
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 tracking-wider text-center leading-tight whitespace-pre-line">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="animate-fade-in-delay-2 relative mx-auto lg:ml-auto w-[330px] h-[670px] bg-[#FCFBFF] rounded-[48px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1),0_0_0_12px_rgba(255,255,255,1)] flex flex-col overflow-hidden">
                <div className="absolute inset-0 border border-slate-100/50 rounded-[48px] pointer-events-none z-50" />

                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50">
                    <div className="w-[120px] h-6 bg-white rounded-b-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]" />
                </div>

                {/* Status Bar */}
                <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[11px] font-medium text-slate-800 z-40 bg-transparent">
                    <span>11:11</span>
                    <div className="flex gap-1.5 items-center">
                        <RiSignalTowerLine className="w-3.5 h-3.5" />
                        <RiWifiLine className="w-3.5 h-3.5" />
                        <RiBatteryLine className="w-4 h-4 ml-0.5" />
                    </div>
                </div>

                {/* App Header */}
                <div className="flex items-center justify-between mt-4 px-6 z-40">
                    <Image src="/logo1.png" alt="App Logo" width={36} height={36} className="w-9 h-9 rounded-full shadow-sm bg-white" />
                    <span className="font-semibold text-slate-800 text-[15px]">Kynari App</span>
                    <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100">
                        <RiBellLine className="w-4 h-4 text-slate-600" />
                    </div>
                </div>

                {/* Inner Content Area */}
                <div className="flex-1 relative mt-8 flex flex-col">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 mix-blend-multiply">
                        <div className="absolute top-10 -left-10 w-48 h-48 bg-[#93E2FA] rounded-full blur-[40px]" />
                        <div className="absolute top-40 -right-10 w-48 h-48 bg-[#E6D4F9] rounded-full blur-[40px]" />
                        <div className="absolute bottom-20 left-10 w-48 h-48 bg-[#FDE7C0] rounded-full blur-[40px]" />
                    </div>

                    {/* Central Animation */}
                    <div className="relative flex-1 flex items-center justify-center -mt-8">
                        <div className="relative w-40 h-40 rounded-full z-20 shadow-[0_8px_30px_rgba(0,0,0,0.08)] bg-white overflow-hidden border-2 border-white/50">
                            <video
                                src="/video.mp4"
                                autoPlay loop muted playsInline
                                className="w-full h-full object-cover scale-[1.02]"
                            />
                        </div>

                        {/* Floating Emotion Bubbles */}
                        <div className="absolute w-[280px] h-[280px] z-30 pointer-events-none">
                            {/* Happy */}
                            <div className="absolute top-[10%] left-[5%] w-[88px] h-[88px] rounded-full bg-[#A2DDF4]/90 backdrop-blur-sm shadow-md flex flex-col items-center justify-center animate-float" style={{ animationDelay: "0s" }}>
                                <RiEmotionHappyLine className="w-7 h-7 text-slate-700 mb-0.5" />
                                <span className="text-[11px] font-medium text-slate-800">Happy</span>
                            </div>

                            {/* Tired */}
                            <div className="absolute top-[15%] right-[0%] w-[84px] h-[84px] rounded-full bg-[#D4D6DC]/90 backdrop-blur-sm shadow-md flex flex-col items-center justify-center animate-float" style={{ animationDelay: "1.5s" }}>
                                <RiMoonLine className="w-7 h-7 text-slate-700 mb-0.5" />
                                <span className="text-[11px] font-medium text-slate-800">Tired</span>
                            </div>

                            {/* Curious */}
                            <div className="absolute bottom-[10%] left-[0%] w-[92px] h-[92px] rounded-full bg-[#FCE2A6]/90 backdrop-blur-sm shadow-md flex flex-col items-center justify-center animate-float" style={{ animationDelay: "2.5s" }}>
                                <RiSearchEyeLine className="w-7 h-7 text-slate-700 mb-0.5" />
                                <span className="text-[11px] font-medium text-slate-800">Curious</span>
                            </div>

                            {/* Frustrated */}
                            <div className="absolute bottom-[5%] right-[5%] w-[88px] h-[88px] rounded-full bg-[#F3A595]/90 backdrop-blur-sm shadow-md flex flex-col items-center justify-center animate-float" style={{ animationDelay: "0.8s" }}>
                                <RiEmotionUnhappyLine className="w-7 h-7 text-white mb-0.5" />
                                <span className="text-[11px] font-medium text-slate-800">Frustrated</span>
                            </div>
                        </div>

                        {/* Connecting lines */}
                        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-20" viewBox="0 0 280 280">
                            <path d="M74,74 C140,140 140,140 140,140" stroke="#1c1b29" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                            <path d="M220,90 C140,140 140,140 140,140" stroke="#1c1b29" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                            <path d="M60,200 C140,140 140,140 140,140" stroke="#1c1b29" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                            <path d="M220,210 C140,140 140,140 140,140" stroke="#1c1b29" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                            <path d="M 60 180 Q 140 220 220 180" stroke="#F0897A" strokeWidth="1" fill="none" opacity="0.6" />
                            <path d="M 80 190 Q 140 210 200 190" stroke="#A2DDF4" strokeWidth="1" fill="none" opacity="0.6" />
                        </svg>
                    </div>

                    {/* Timeline */}
                    <div className="px-6 pb-6 bg-white/60 backdrop-blur-md rounded-t-[32px] pt-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] border-t border-white/80">
                        <h3 className="text-xs font-semibold text-slate-800 mb-3 px-1">Timeline</h3>
                        <div className="flex h-[22px] rounded-md overflow-hidden w-full shadow-inner mb-2 border border-slate-100/50">
                            <div className="bg-[#A2DDF4] w-[35%] flex items-center justify-center">
                                <span className="text-[9px] font-semibold text-slate-700 tracking-wide uppercase">Calm</span>
                            </div>
                            <div className="bg-[#F3A595] w-[40%] flex items-center justify-center border-l-2 border-white/20">
                                <span className="text-[9px] font-semibold text-white tracking-wide uppercase">Frustration</span>
                            </div>
                            <div className="bg-[#B5EAC5] w-[25%] flex items-center justify-center border-l-2 border-white/20">
                                <span className="text-[9px] font-semibold text-slate-700 tracking-wide uppercase">Joy</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] text-slate-500 font-medium">mood flow</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Nav */}
                <div className="flex justify-between items-center px-8 py-5 bg-white border-t border-slate-100 z-50">
                    <div className="flex flex-col items-center">
                        <RiHome4Fill className="w-[22px] h-[22px] text-[#2C2162]" />
                        <div className="w-1 h-1 rounded-full bg-[#2C2162] mt-1" />
                    </div>
                    <RiLineChartLine className="w-[22px] h-[22px] text-slate-400" />
                    <RiBellLine className="w-[22px] h-[22px] text-slate-400" />
                    <RiUserLine className="w-[22px] h-[22px] text-slate-400" />
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-1.5 inset-x-0 h-2 flex justify-center z-50">
                    <div className="w-32 h-[5px] bg-[#1a1b2e] rounded-full opacity-80" />
                </div>
            </div>
        </div>
    );
}
