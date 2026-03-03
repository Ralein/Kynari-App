import Link from "next/link";
import { Shield, Brain, BarChart3, Mic, Heart, Lock, Star, ArrowRight } from "lucide-react";

/* ─── Inline SVG Illustrations ────────────────────────────── */

function HeroIllustration() {
  return (
    <svg viewBox="0 0 400 320" fill="none" className="w-full max-w-md mx-auto" aria-hidden="true">
      {/* Background blobs */}
      <ellipse cx="200" cy="180" rx="180" ry="140" fill="#f3e8ff" opacity="0.6" />
      <ellipse cx="140" cy="200" rx="80" ry="70" fill="#e9d5ff" opacity="0.5" />
      <ellipse cx="280" cy="160" rx="60" ry="55" fill="#fef3c7" opacity="0.4" />

      {/* Cute baby face */}
      <circle cx="200" cy="150" r="70" fill="#fde8ef" />
      <circle cx="200" cy="150" r="65" fill="#fff1f5" />

      {/* Eyes */}
      <ellipse cx="180" cy="140" rx="8" ry="10" fill="#1e1b2e" />
      <ellipse cx="220" cy="140" rx="8" ry="10" fill="#1e1b2e" />
      <circle cx="183" cy="137" r="3" fill="white" />
      <circle cx="223" cy="137" r="3" fill="white" />

      {/* Smile */}
      <path d="M185 165 Q200 180 215 165" stroke="#e879a0" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Cheeks */}
      <circle cx="168" cy="158" r="10" fill="#fda4af" opacity="0.4" />
      <circle cx="232" cy="158" r="10" fill="#fda4af" opacity="0.4" />

      {/* Floating emotion bubbles */}
      <g className="animate-float">
        <circle cx="100" cy="80" r="22" fill="#86efac" opacity="0.7" />
        <text x="100" y="86" textAnchor="middle" fontSize="18">😊</text>
      </g>
      <g className="animate-float" style={{ animationDelay: "1s" }}>
        <circle cx="310" cy="90" r="20" fill="#93c5fd" opacity="0.7" />
        <text x="310" y="96" textAnchor="middle" fontSize="16">💤</text>
      </g>
      <g className="animate-float" style={{ animationDelay: "2s" }}>
        <circle cx="80" cy="220" r="18" fill="#c4b5fd" opacity="0.7" />
        <text x="80" y="225" textAnchor="middle" fontSize="14">🎵</text>
      </g>
      <g className="animate-float" style={{ animationDelay: "0.5s" }}>
        <circle cx="330" cy="210" r="16" fill="#fdba74" opacity="0.7" />
        <text x="330" y="215" textAnchor="middle" fontSize="13">⭐</text>
      </g>

      {/* Sound waves */}
      <path d="M120 260 Q160 240 200 260 Q240 280 280 260" stroke="#d8b4fe" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M140 280 Q180 260 220 280 Q260 300 300 280" stroke="#e9d5ff" strokeWidth="1.5" fill="none" opacity="0.4" />
    </svg>
  );
}

function FloatingStars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute top-24 left-[10%] w-3 h-3 rounded-full bg-primary-300/40 animate-float" />
      <div className="absolute top-40 right-[15%] w-2 h-2 rounded-full bg-peach/40 animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-40 left-[20%] w-2.5 h-2.5 rounded-full bg-mint/30 animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute top-60 right-[25%] w-2 h-2 rounded-full bg-blush/40 animate-bounce-gentle" style={{ animationDelay: "0.5s" }} />
      <div className="absolute bottom-60 right-[10%] w-3 h-3 rounded-full bg-primary-200/50 animate-float" style={{ animationDelay: "1.5s" }} />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ─── Background ────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-surface-warm animate-gradient" />
        <div className="absolute top-20 -left-20 w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-peach-light/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-100/15 rounded-full blur-3xl" />
      </div>
      <FloatingStars />

      {/* ─── Navigation ──────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary-800 font-[family-name:var(--font-sans)]">
            Kynari
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-primary-600 hover:text-primary-800 hover:bg-primary-50 transition-all duration-200"
        >
          Sign In
        </Link>
      </nav>

      {/* ─── Hero Section ──────────────────────────────────── */}
      <main className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center text-center pt-10 pb-16 md:pt-16 md:pb-24">
          {/* Badge */}
          <div className="animate-fade-in mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100/80 backdrop-blur-sm border border-primary-200/50 text-sm font-semibold text-primary-700">
              <Shield className="w-3.5 h-3.5" />
              Privacy-first AI for families
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-delay-1 text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl font-[family-name:var(--font-sans)]">
            Your child&apos;s emotional world,{" "}
            <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 bg-clip-text text-transparent">
              made visible
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in-delay-2 mt-6 text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed">
            Kynari listens for emotional tone — not words — and helps you
            understand your toddler&apos;s feelings with on-device AI that never
            stores audio.
          </p>

          {/* CTA */}
          <div className="animate-fade-in-delay-3 mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/login"
              className="btn-primary text-base px-8 py-4"
            >
              <Star className="w-4 h-4" />
              Get Started — Free
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3.5 rounded-full text-sm font-semibold text-text-secondary hover:text-primary-600 transition-colors duration-200 flex items-center gap-1"
            >
              See how it works
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Illustration */}
          <div className="mt-12 animate-fade-in-delay-3">
            <HeroIllustration />
          </div>
        </div>

        {/* ─── How It Works ──────────────────────────────────── */}
        <section id="how-it-works" className="py-20">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-sans)]">
              Simple. Private. Insightful.
            </h2>
            <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
              Three promises, technically enforced.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="card-soft p-8 group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Mic className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 font-[family-name:var(--font-sans)]">
                We listen for tone
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Kynari detects emotional prosody — the music of your child&apos;s
                voice — not their words. Think pitch, rhythm, and energy.
              </p>
            </div>

            {/* Card 2 */}
            <div className="card-soft p-8 group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Brain className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 font-[family-name:var(--font-sans)]">
                AI runs on your phone
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                All emotion recognition happens on-device using ONNX Runtime.
                No audio ever leaves your phone. Ever.
              </p>
            </div>

            {/* Card 3 */}
            <div className="card-soft p-8 group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-peach-light to-peach/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <BarChart3 className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 font-[family-name:var(--font-sans)]">
                Only labels reach us
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                We receive tiny data packets — just an emotion label, a confidence
                score, and a timestamp. That&apos;s it.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Emotion Preview ──────────────────────────────── */}
        <section className="py-20">
          <div className="glass-purple rounded-3xl p-10 md:p-14 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-sans)]">
                What parents see
              </h2>
              <p className="mt-3 text-text-secondary">
                A daily emotional snapshot — personalized after 7 days.
              </p>
            </div>

            {/* Mock Insight Card */}
            <div className="card-soft p-6 max-w-md mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center text-white font-bold text-sm font-[family-name:var(--font-sans)]">
                  E
                </div>
                <div>
                  <p className="font-bold text-sm font-[family-name:var(--font-sans)]">Emma, 3 years old</p>
                  <p className="text-text-muted text-xs">Today&apos;s Summary</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">😄</span>
                <span className="px-3 py-1 rounded-full bg-emotion-happy/20 text-emerald-700 text-sm font-semibold">
                  Happy
                </span>
                <span className="text-text-muted text-xs ml-auto">
                  Dominant today
                </span>
              </div>

              {/* Emotion Bar */}
              <div className="flex rounded-full overflow-hidden h-3 mb-4">
                <div className="bg-emotion-happy" style={{ width: "45%" }} />
                <div className="bg-emotion-neutral" style={{ width: "25%" }} />
                <div className="bg-emotion-frustrated" style={{ width: "15%" }} />
                <div className="bg-emotion-sad" style={{ width: "10%" }} />
                <div className="bg-emotion-fearful" style={{ width: "5%" }} />
              </div>

              <p className="text-sm text-text-secondary leading-relaxed">
                ✨ A great day overall! More playful than usual, especially
                between 10am–12pm. Slight frustration around snack time.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Privacy Footer ──────────────────────────────── */}
        <section className="py-16 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-mint-dark" />
              Zero audio storage
            </span>
            <span className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-mint-dark" />
              On-device AI
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-mint-dark" />
              COPPA compliant
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-mint-dark" />
              End-to-end encrypted
            </span>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-primary-100/60 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            © 2026 Kynari. Built with care for families.
          </p>
          <div className="flex gap-6 text-sm text-text-muted">
            <Link href="/privacy" className="hover:text-primary-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary-600 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
