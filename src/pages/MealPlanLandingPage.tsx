import { useState } from "react";
import { Page } from "@/data";
import { MealPlanLogo } from "@/components/Logos";

interface Props {
  navigate: (page: Page) => void;
  navigateToWizard: (plan?: string) => void;
}

const GOALS = [
  {
    id: "CUT",
    label: "CUT",
    headline: "Fat Loss",
    desc: "Structured calorie deficit with high protein retention. Designed for meaningful, sustainable fat loss.",
    macros: "1,600–1,900 kcal · 40%+ protein",
    weeks: "8–12 weeks recommended",
  },
  {
    id: "MAINTAIN",
    label: "MAINTAIN",
    headline: "Performance",
    desc: "Balanced macros to sustain energy, support training, and maintain your current body composition.",
    macros: "2,000–2,400 kcal · Balanced macros",
    weeks: "Ongoing lifestyle plan",
    featured: true,
  },
  {
    id: "BUILD",
    label: "BUILD",
    headline: "Muscle Gain",
    desc: "Calorie surplus with strategic protein timing to fuel muscle growth and recovery.",
    macros: "2,600–3,200 kcal · High protein surplus",
    weeks: "12–16 weeks recommended",
  },
];

const PLANS = [
  { n: "Lunch Only", meals: 5, freq: "per delivery", price: 120, from: true, desc: "5 lunches per delivery. Clean fuel for your workday, zero prep." },
  { n: "Lunch + Dinner", meals: 10, freq: "per delivery", price: 180, from: true, desc: "10 meals per delivery — lunch and dinner covered Mon–Fri.", badge: "POPULAR" },
  { n: "Full Programme", meals: 14, freq: "per delivery", price: 200, from: true, desc: "Lunch + dinner across your full programme. Maximum consistency.", badge: "BEST VALUE" },
];

const HOW_IT_WORKS = [
  { n: "01", label: "Set your goal", desc: "CUT, MAINTAIN, or BUILD. We build your plan from your target, not the other way around." },
  { n: "02", label: "Choose your meals", desc: "Select from 40+ fresh chef-prepared options. Swap any meal you don't love." },
  { n: "03", label: "We prep, you receive", desc: "Prepared daily in our Singapore kitchen. Delivered fresh the next morning by 10am." },
  { n: "04", label: "Track and adjust", desc: "Personal check-ins, macro reports, and a team that actually responds. This is boutique service." },
];

const testimonials = [
  { name: "Jonathan C.", role: "CUT plan, 12 weeks", text: "Down 9kg. My nutritionist was impressed. The personalised check-ins made the difference.", stars: 5 },
  { name: "Mei Lin T.", role: "MAINTAIN plan, 6 months", text: "Finally stopped guessing what to eat. The plan fits my training schedule perfectly.", stars: 5 },
  { name: "Ravi S.", role: "BUILD plan, 8 weeks", text: "Gained 4kg lean mass. The calorie surplus meals actually taste great — that was unexpected.", stars: 5 },
];

const ORANGE = "#E85D04";

export default function MealPlanLandingPage({ navigate, navigateToWizard }: Props) {
  const [selectedGoal, setSelectedGoal] = useState("MAINTAIN");

  return (
    <div className="bg-white text-[#1A1A1A] min-h-screen">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden min-h-[80svh] flex items-center bg-[#1A1A1A]">
        {/* Right-half food photo — editorial split */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[52%] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1539735776517-befcae86494d?w=1200&h=900&fit=crop&auto=format&q=85"
            alt="Premium plated meal — Meal Plan"
            className="w-full h-full object-cover object-center"
          />
          {/* Left-edge bleed: photo fades into charcoal */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(26,26,26,1) 0%, rgba(26,26,26,0.55) 30%, rgba(26,26,26,0.1) 70%, rgba(26,26,26,0) 100%)" }} />
          {/* Orange accent wash — boutique warmth */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(232,93,4,0.12) 0%, transparent 65%)" }} />
        </div>
        {/* Bottom fade to white (next section is FAF9F6) */}
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(26,26,26,1), transparent)" }} />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 sm:px-8 py-20 sm:py-28">
          <button onClick={() => navigate("home")}
            className="inline-flex items-center gap-2 text-white/30 hover:text-white/70 transition-colors text-[11px] font-mono tracking-widest uppercase mb-12">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Performance Meals
          </button>

          <div className="mb-8 max-w-[520px]">
            <MealPlanLogo size="md" variant="dark" />
          </div>

          <div className="max-w-[520px]">
            <p className="text-[11px] font-mono tracking-[0.4em] uppercase mb-5" style={{ color: ORANGE }}>Boutique Progress</p>
            <h1 className="font-display text-[32px] sm:text-[44px] lg:text-[58px] font-semibold leading-[1.0] mb-7 text-white">
              Fresh structure.<br />
              <span style={{ color: ORANGE }}>Personal support.</span>
            </h1>
            <p className="text-white/50 text-[16px] leading-relaxed mb-10">
              Exceptional meals, tailored guidance, and practical support for meaningful progress — built around the way you actually live.
            </p>

            {/* Key proof points — calm editorial style */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 mb-10">
              {[
                { v: "40+", l: "Fresh meal options" },
                { v: "10am", l: "Daily delivery" },
                { v: "Boutique", l: "Personal support" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-[22px] font-semibold text-white">{s.v}</div>
                  <div className="text-white/35 text-[11px] mt-0.5 tracking-wide">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigateToWizard(selectedGoal)}
                className="inline-flex items-center gap-3 px-8 py-4 font-semibold text-[13px] tracking-[0.12em] uppercase text-white transition-opacity hover:opacity-85"
                style={{ backgroundColor: ORANGE }}>
                Start your plan
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button onClick={() => navigate("about")}
                className="inline-flex items-center gap-3 px-8 py-4 font-medium text-[13px] border border-white/20 text-white/60 hover:border-white/40 hover:text-white transition-all">
                About Us
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── GOAL SELECTOR ── */}
      <section className="py-16 px-6 sm:px-8 bg-[#FAF9F6]">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: ORANGE }}>Your goals deserve consistent support.</p>
            <h2 className="font-display text-[32px] sm:text-[40px] font-semibold text-[#1A1A1A]">Choose your goal.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {GOALS.map((g) => {
              const selected = selectedGoal === g.id;
              return (
                <button key={g.id} onClick={() => setSelectedGoal(g.id)}
                  className={`text-left p-6 border-2 transition-all ${selected ? "border-[#1A1A1A] bg-white" : "border-[#E8E4DC] bg-white hover:border-[#1A1A1A]/30"}`}>
                  {g.featured && (
                    <div className="text-[9px] font-bold tracking-[0.2em] uppercase mb-3 px-2 py-1 inline-block" style={{ backgroundColor: ORANGE, color: "white" }}>
                      Most Common
                    </div>
                  )}
                  <div className="font-display text-[22px] font-bold text-[#1A1A1A] mb-1">{g.headline}</div>
                  <div className="text-[11px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: selected ? ORANGE : "#999" }}>{g.label}</div>
                  <p className="text-[#666] text-[13px] leading-relaxed mb-4">{g.desc}</p>
                  <div className="text-[11px] text-[#888] font-mono">{g.macros}</div>
                  <div className="text-[11px] text-[#aaa] mt-1">{g.weeks}</div>
                  {selected && <div className="mt-4 text-[11px] font-bold tracking-wider" style={{ color: ORANGE }}>✓ Selected</div>}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button onClick={() => navigateToWizard(selectedGoal)}
              className="w-full sm:w-auto px-10 py-4 font-bold text-[13px] tracking-[0.15em] uppercase text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: ORANGE }}>
              Start My {GOALS.find((g) => g.id === selectedGoal)?.headline} Plan →
            </button>
            <p className="text-[12px] text-[#aaa]">No long-term commitment · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ── THE PROCESS ── */}
      <section className="relative overflow-hidden bg-[#1A1A1A]">

        {/* Section header */}
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 pt-20 pb-0 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[11px] font-mono tracking-[0.45em] uppercase mb-4" style={{ color: ORANGE }}>The Process</p>
            <h2 className="font-display text-[44px] sm:text-[60px] font-extrabold text-white leading-[0.9]">
              Four steps.<br /><span style={{ color: ORANGE }}>Real results.</span>
            </h2>
          </div>
          <p className="text-white/40 text-[15px] leading-relaxed max-w-[300px] lg:mb-2">
            From setting your goal to your first delivery — here's exactly how it works.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 pt-14 pb-20">
          {HOW_IT_WORKS.map((s, i) => {
            const isEven = i % 2 === 0;
            return (
              <div key={s.n} className={`relative flex flex-col lg:flex-row items-stretch gap-0 mb-0 ${i < HOW_IT_WORKS.length - 1 ? "border-b border-white/6" : ""}`}>

                {/* Number column */}
                <div className={`shrink-0 lg:w-[220px] flex items-center justify-center py-10 lg:py-14 border-b lg:border-b-0 ${isEven ? "lg:border-r border-white/6" : "lg:border-r border-white/6 lg:order-last"}`}>
                  <span
                    className="font-display font-extrabold select-none leading-none"
                    style={{ fontSize: "clamp(72px, 10vw, 110px)", color: i === 0 ? ORANGE : "rgba(255,255,255,0.06)" }}
                  >
                    {s.n}
                  </span>
                </div>

                {/* Content column */}
                <div className={`flex-1 px-0 lg:px-14 py-10 lg:py-14 flex flex-col justify-center ${!isEven ? "lg:order-first" : ""}`}>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-[2px]" style={{ backgroundColor: ORANGE }} />
                    <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-white/30">Step {s.n}</span>
                  </div>
                  <h3 className="font-display text-[26px] sm:text-[32px] font-extrabold text-white leading-tight mb-4">
                    {s.label}
                  </h3>
                  <p className="text-white/50 text-[15px] leading-relaxed max-w-[520px]">{s.desc}</p>
                </div>

                {/* Right accent — only on even rows (large decorative icon) */}
                {isEven && (
                  <div className="hidden lg:flex shrink-0 w-[140px] items-center justify-center opacity-20">
                    {i === 0 && <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
                    {i === 2 && <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA bar */}
        <div className="border-t border-white/8 px-6 sm:px-10 py-8">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
            <p className="text-white/40 text-[13px] font-mono">Ready to start? The whole process takes under 5 minutes.</p>
            <button
              onClick={() => navigateToWizard(selectedGoal)}
              className="inline-flex items-center gap-3 px-8 py-4 font-extrabold text-[12px] tracking-[0.2em] uppercase text-[#1A1A1A] hover:opacity-90 transition-opacity shrink-0"
              style={{ backgroundColor: ORANGE }}>
              Begin My Plan
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── PLAN COMPARISON ── */}
      <section className="py-16 px-6 sm:px-8 bg-[#FAF9F6]">
        <div className="max-w-[900px] mx-auto">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: ORANGE }}>Structured plans</p>
            <h2 className="font-display text-[32px] sm:text-[40px] font-semibold text-[#1A1A1A]">Choose your frequency.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PLANS.map((p) => (
              <div key={p.n} className={`border-2 bg-white p-7 relative ${p.badge === "POPULAR" ? "border-[#1A1A1A]" : "border-[#E8E4DC]"}`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.2em] uppercase px-3 py-1 text-white" style={{ backgroundColor: ORANGE }}>
                    {p.badge}
                  </div>
                )}
                <div className="font-display text-[20px] font-semibold text-[#1A1A1A] mb-1">{p.n}</div>
                <div className="text-[#888] text-[12px] mb-4">{p.meals} meals · {p.freq}</div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[#aaa] text-[13px]">from</span>
                  <span className="font-display text-[36px] font-bold text-[#1A1A1A]">${p.price}</span>
                </div>
                <div className="text-[#aaa] text-[11px] mb-5">{p.freq} · exact price set in wizard</div>
                <p className="text-[#666] text-[12px] leading-relaxed mb-6">{p.desc}</p>
                <button onClick={() => navigateToWizard(selectedGoal)}
                  className={`w-full py-3.5 font-bold text-[12px] tracking-[0.15em] uppercase transition-colors ${p.badge === "POPULAR" ? "text-white hover:opacity-90" : "border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"}`}
                  style={p.badge === "POPULAR" ? { backgroundColor: ORANGE } : {}}>
                  Choose {p.n} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-16 px-6 sm:px-8 border-t border-[#E8E4DC]">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: ORANGE }}>Real results</p>
            <h2 className="font-display text-[32px] sm:text-[40px] font-semibold text-[#1A1A1A]">Your goals deserve consistent support.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="border border-[#E8E4DC] bg-[#FAF9F6] p-6">
                <div className="flex mb-3">
                  {[...Array(t.stars)].map((_, i) => (
                    <span key={i} className="text-[14px]" style={{ color: ORANGE }}>★</span>
                  ))}
                </div>
                <p className="text-[#444] text-[14px] leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="font-semibold text-[13px] text-[#1A1A1A]">{t.name}</div>
                <div className="text-[11px] text-[#999]">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CROSS-LINK: READY SERIES ── */}
      <section className="py-10 px-6 sm:px-8 border-t border-[#E8E4DC] bg-[#FAF9F6]">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase mb-1" style={{ color: "#F5B300" }}>Ready Series</p>
            <p className="text-[#1A1A1A] font-display text-[20px] font-semibold">Looking for single meals, no subscription?</p>
            <p className="text-[#888] text-[13px] mt-1">Order individual ready-to-eat meals and bundles — no commitment, no plan.</p>
          </div>
          <button onClick={() => navigate("ready-series")}
            className="shrink-0 border-2 border-[#1A1A1A] text-[#1A1A1A] px-8 py-3 font-bold text-[12px] tracking-[0.15em] uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors whitespace-nowrap">
            Browse Ready Series →
          </button>
        </div>
      </section>

      {/* ── PROMISE ── */}
      <section className="py-14 px-6 sm:px-8 border-t border-[#E8E4DC] bg-[#1A1A1A] text-white">
        <div className="max-w-[900px] mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: ORANGE }}>The Meal Plan promise</p>
            <h2 className="font-display text-[28px] sm:text-[36px] font-semibold leading-tight mb-3">Your goals deserve consistent support. Start your plan today.</h2>
            <p className="text-white/50 text-[14px] leading-relaxed">Personalised guidance. Goal-led meal selection. Real support from real people.</p>
          </div>
          <div className="shrink-0">
            <button onClick={() => navigateToWizard(selectedGoal)}
              className="px-10 py-4 font-bold text-[13px] tracking-[0.15em] uppercase text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#E85D04" }}>
              Start Your Plan →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
