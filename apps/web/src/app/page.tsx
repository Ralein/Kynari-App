import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ─── Background Gradient ──────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-coral-light/20 animate-gradient" />
        <div className="absolute top-20 -left-20 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-coral/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* ─── Navigation ───────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <span className="text-white font-semibold text-lg font-[family-name:var(--font-sans)]">K</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-teal-800 font-[family-name:var(--font-sans)]">
            Kynari
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-full text-sm font-medium text-teal-700 hover:text-teal-900 hover:bg-teal-50 transition-all duration-200"
        >
          Sign In
        </Link>
      </nav>

      {/* ─── Hero Section ─────────────────────────────────── */}
      <main className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center text-center pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Badge */}
          <div className="animate-fade-in mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-medium text-teal-700">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-soft" />
              Privacy-first AI for families
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-delay-1 text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl font-[family-name:var(--font-sans)]">
            Your child&apos;s emotional world,{" "}
            <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
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
              className="group relative px-8 py-3.5 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-base shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all duration-300 hover:scale-[1.02]"
            >
              <span className="relative z-10">Get Started — Free</span>
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3.5 rounded-full text-sm font-medium text-text-secondary hover:text-teal-700 transition-colors duration-200"
            >
              See how it works ↓
            </a>
          </div>
        </div>

        {/* ─── How It Works ─────────────────────────────────── */}
        <section id="how-it-works" className="py-20">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-sans)]">
              Simple. Private. Insightful.
            </h2>
            <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
              Three promises, technically enforced.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="group glass rounded-2xl p-8 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-500 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <span className="text-2xl">🎤</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 font-[family-name:var(--font-sans)]">
                We listen for tone
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Kynari detects emotional prosody — the music of your child&apos;s
                voice — not their words. Think pitch, rhythm, and energy.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group glass rounded-2xl p-8 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-500 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 font-[family-name:var(--font-sans)]">
                AI runs on your phone
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                All emotion recognition happens on-device using ONNX Runtime.
                No audio ever leaves your phone. Ever.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group glass rounded-2xl p-8 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-500 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-coral-light to-coral/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 font-[family-name:var(--font-sans)]">
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
          <div className="glass-dark rounded-3xl p-10 md:p-14 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-sans)]">
                What parents see
              </h2>
              <p className="mt-3 text-text-secondary">
                A daily emotional snapshot — personalized after 7 days.
              </p>
            </div>

            {/* Mock Insight Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-teal-100/50 max-w-md mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center text-white font-semibold text-sm font-[family-name:var(--font-sans)]">
                  E
                </div>
                <div>
                  <p className="font-semibold text-sm font-[family-name:var(--font-sans)]">Emma, 3 years old</p>
                  <p className="text-text-muted text-xs">Today&apos;s Summary</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">😄</span>
                <span className="px-3 py-1 rounded-full bg-emotion-happy/15 text-emerald-700 text-sm font-medium">
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

        {/* ─── Privacy Footer ───────────────────────────────── */}
        <section className="py-16 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Zero audio storage
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              On-device AI
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              COPPA compliant
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              End-to-end encrypted
            </span>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-stone-200/60 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            © 2026 Kynari. Built with care for families.
          </p>
          <div className="flex gap-6 text-sm text-text-muted">
            <Link href="/privacy" className="hover:text-teal-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-teal-600 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
