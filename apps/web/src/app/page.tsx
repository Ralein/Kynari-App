import { BackgroundGradients } from "@/components/ui/BackgroundGradients";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { EmotionPreview } from "@/components/landing/EmotionPreview";
import { PrivacyFooter } from "@/components/landing/PrivacyFooter";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#Fdfbf9] font-[family-name:var(--font-sans)] text-[#1C1C2A]">
      {/* ─── Background Gradients ────────────────────────────────────── */}
      <BackgroundGradients />

      {/* Decorative particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute top-[15%] left-[10%] w-2 h-2 rounded-full bg-slate-400 opacity-60 animate-pulse" />
        <div className="absolute top-[25%] left-[8%] w-1.5 h-1.5 rounded-full bg-orange-300 opacity-80 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-[60%] left-[5%] w-3 h-3 rounded-full bg-slate-300 opacity-50 animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] right-[45%] w-2 h-2 rounded-full bg-blue-300 opacity-70 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute top-[30%] right-[5%] w-2.5 h-2.5 rounded-full bg-slate-700 opacity-80 animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-[20%] right-[15%] w-3 h-3 rounded-full bg-slate-800 opacity-90 animate-pulse" />
        <div className="absolute bottom-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-slate-400 opacity-60 animate-pulse" style={{ animationDelay: "2.5s" }} />
      </div>

      {/* ─── Navigation ──────────────────────────────────── */}
      <Navbar />

      {/* ─── Main Content ──────────────────────────────────── */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 pt-10 pb-20">

        {/* ─── Hero Grid ──────────────────────────────────── */}
        <Hero />

        <HowItWorks />
        <EmotionPreview />
        <PrivacyFooter />
      </main>

      {/* Decorative sparkle */}
      <div className="absolute bottom-8 right-8 pointer-events-none -z-10 animate-pulse">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
          <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z" fill="white" />
          <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z" fill="#FCECD8" fillOpacity="0.5" />
        </svg>
      </div>
    </div>
  );
}