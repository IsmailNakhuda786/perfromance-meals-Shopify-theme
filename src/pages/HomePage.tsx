import { useState, useEffect, useRef } from "react";
import type { Page } from "@/data";

import { PerformanceMealsLogo, MealPlanLogo, ReadySeriesLogo } from "@/components/Logos";

const imgHero    = "/19606.png";
const imgKitchen = "/13da6.png";
const imgChef = "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1200&h=590&fit=crop&auto=format";
const imgReady   = "/d006a.png";
const imgMeal    = "/98c55.png";

/* ─── Shatter image grid ─────────────────────────────────── */
const COLS = 5;
const ROWS = 4;

const CELL_CONFIGS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const cx = (COLS - 1) / 2;
  const cy = (ROWS - 1) / 2;
  const dx = (col - cx) * 100 + (i % 3 === 0 ? 40 : -30);
  const dy = (row - cy) * 90 + (i % 2 === 0 ? 25 : -30);
  const rot = ((i * 37) % 40) - 20;
  const exitDelay  = (col + row) * 28;
  const enterDelay = ((COLS - 1 - col) + (ROWS - 1 - row)) * 24;
  return { col, row, dx, dy, rot, exitDelay, enterDelay };
});

type ShatterPhase = "idle" | "exit" | "enter-init" | "enter";

function ShatterImage({ src, phase }: { src: string; phase: ShatterPhase }) {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
      {CELL_CONFIGS.map(({ col, row, dx, dy, rot, exitDelay, enterDelay }, i) => {
        let transform: string;
        let opacity: number;
        let transition: string;

        if (phase === "exit") {
          transform  = `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(0.5)`;
          opacity    = 0;
          transition = `transform 480ms ease-in ${exitDelay}ms, opacity 360ms ease-in ${exitDelay}ms`;
        } else if (phase === "enter-init") {
          // Snap to scatter with NO transition — browser paints this before animating
          transform  = `translate(${-dx * 0.8}px,${-dy * 0.8}px) rotate(${-rot * 0.5}deg) scale(0.7)`;
          opacity    = 0;
          transition = "none";
        } else if (phase === "enter") {
          transform  = "translate(0,0) rotate(0deg) scale(1)";
          opacity    = 1;
          transition = `transform 500ms cubic-bezier(0.16,1,0.3,1) ${enterDelay}ms, opacity 350ms ease-out ${enterDelay}ms`;
        } else {
          // idle — no transition, fully visible
          transform  = "translate(0,0) rotate(0deg) scale(1)";
          opacity    = 1;
          transition = "none";
        }

        // background-size/position trick: scale image to span all cells, offset per cell
        return (
          <div key={i} style={{ overflow: "hidden", position: "relative", transform, opacity, transition }}>
            <div style={{
              position: "absolute",
              width: `${COLS * 100}%`,
              height: `${ROWS * 100}%`,
              left: `-${col * 100}%`,
              top: `-${row * 100}%`,
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Stats bridge ───────────────────────────────────────── */
const STATS = [
  { target: 8400, suffix: "+", label: "ACTIVE CUSTOMERS" },
  { target: 40,   suffix: "+", label: "READY MEALS" },
  { target: 3,    suffix: " min", label: "READY TO EAT" },
  { target: 2,    suffix: "",   label: "MAIN JOURNEYS" },
];

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

function StatItem({ target, suffix, label, active, delay }: { target: number; suffix: string; label: string; active: boolean; delay: number }) {
  const val = useCountUp(target, active, 1800);
  const display = target >= 1000 ? val.toLocaleString() : String(val);
  return (
    <div
      className="flex flex-col gap-1 md:border-l md:first:border-l-0 border-[#1A1A1A]/15 md:pl-10 md:first:pl-0"
      style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(18px)", transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms` }}
    >
      <span className="font-display font-extrabold text-[#1A1A1A] leading-none tabular-nums" style={{ fontSize: "clamp(24px, 2.8vw, 38px)" }}>
        {display}{suffix}
      </span>
      <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#1A1A1A]/60">{label}</span>
    </div>
  );
}

function StatsBridge() {
  const [cycle, setCycle] = useState(0);
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(false);
    const onId = setTimeout(() => setActive(true), 120);
    const offId = setTimeout(() => {
      setActive(false);
      setTimeout(() => setCycle(c => c + 1), 400);
    }, 5000);
    return () => { clearTimeout(onId); clearTimeout(offId); };
  }, [cycle]);
  return (
    <div className="bg-[#F5B300] py-8 px-8 sm:px-16">
      <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0">
        {STATS.map((s, i) => (
          <StatItem key={`${cycle}-${i}`} {...s} active={active} delay={i * 130} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  navigate: (page: Page) => void;
  navigateToWizard?: (plan?: string) => void;
}

/* ─── Carousel slides ─────────────────────────────────────── */
const SLIDES = [
  {
    eyebrow: "PERFORMANCE MEALS / SINGAPORE",
    headline: ["NUTRITION", "THAT WORKS", "AS HARD", "AS YOU DO."],
    sub: "Exceptional meals and thoughtful support that make healthy eating easier every day.",
    img: imgHero,
    ctaPrimary: { label: "BROWSE READY SERIES", action: "ready-series" as const },
    ctaSecondary: { label: "EXPLORE MEAL PLAN", action: "meal-plan" as const },
  },
  {
    eyebrow: "PERFORMANCE MEALS / MEAL PLAN",
    headline: ["FRESH STRUCTURE,", "PERSONAL", "GUIDANCE,", "REAL RESULTS."],
    sub: "A structured fresh-meal plan with real check-ins and support around your goal.",
    img: imgMeal,
    ctaPrimary: { label: "EXPLORE MEAL PLAN", action: "meal-plan" as const },
    ctaSecondary: null,
  },
  {
    eyebrow: "PERFORMANCE MEALS / READY-SERIES",
    headline: ["FROZEN.", "MACRO-TRACKED.", "ZERO", "COMPROMISE."],
    sub: "40+ chef-prepared frozen meals for busy weeks. Fast, flexible, and dependable.",
    img: imgReady,
    ctaPrimary: { label: "EXPLORE READY SERIES", action: "ready-series" as const },
    ctaSecondary: null,
  },
];

/* ─── Brand Family accordion ─────────────────────────────── */
interface BrandFamilyProps {
  brandsRef: React.RefObject<HTMLDivElement | null>;
  brandsVisible: boolean;
  navigate: (page: Page) => void;
}

const BRAND_DATA = [
  {
    num: "01",
    tag: "The Parent Brand",
    logoVariant: "pm" as const,
    headline: ["Credible.", "Caring.", "Principled."],
    body: "Performance Meals sets the purpose, standards, and shared quality foundation that both brand experiences are built on. Every meal, every customer interaction begins here.",
    stat: { v: "Est. 2019", l: "Singapore" },
    cta: "Our Story",
    page: "about" as Page,
    bg: "#F5F2EC",
    accent: "#1A1A1A",
    accentHighlight: "#F5B300",
    textDim: "rgba(26,26,26,0.50)",
    numColor: "rgba(26,26,26,0.05)",
    ctaStyle: "border-b-2 border-[#1A1A1A]/30 text-[#1A1A1A] hover:border-[#F5B300] hover:text-[#F5B300]",
    barColor: "#F5B300",
  },
  {
    num: "02",
    tag: "Boutique Progress",
    logoVariant: "mp" as const,
    headline: ["Fresh structure", "for your", "personal goal."],
    body: "Tailored support, real check-ins, and meaningful results. Designed for people who want more than a generic routine — built around your goal, delivered fresh daily.",
    stat: { v: "6–12 wks", l: "Avg transformation" },
    cta: "Discover Meal Plan",
    page: "meal-plan-landing" as Page,
    bg: "#E85D04",
    accent: "#FFFFFF",
    accentHighlight: "#FFFFFF",
    textDim: "rgba(255,255,255,0.60)",
    numColor: "rgba(255,255,255,0.05)",
    ctaStyle: "bg-white text-[#E85D04] hover:bg-[#1A1A1A] hover:text-white px-6 py-3.5",
    barColor: "rgba(255,255,255,0.35)",
  },
  {
    num: "03",
    tag: "Everyday Momentum",
    logoVariant: "rs" as const,
    headline: ["Ready for", "real life."],
    body: "Fast, enjoyable frozen meals built to keep your week moving without locking you in. Dependable, repeat-friendly, and zero compromise on nutrition.",
    stat: { v: "40+", l: "Macro-tracked meals" },
    cta: "Shop Ready-Series",
    page: "ready-series" as Page,
    bg: "#F5B300",
    accent: "#1A1A1A",
    accentHighlight: "#1A1A1A",
    textDim: "rgba(26,26,26,0.52)",
    numColor: "rgba(26,26,26,0.05)",
    ctaStyle: "bg-[#1A1A1A] text-white hover:bg-white hover:text-[#1A1A1A] px-6 py-3.5",
    barColor: "rgba(26,26,26,0.25)",
  },
];

function BrandFamilySection({ brandsRef, brandsVisible, navigate }: BrandFamilyProps) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section ref={brandsRef} className="overflow-hidden">
      <div className={`bg-white px-6 sm:px-10 pt-12 sm:pt-16 pb-8 transition-all duration-700 ${brandsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-baseline gap-5 mb-5">
            <span className="font-display font-bold text-[#1A1A1A]" style={{ fontSize: "clamp(36px, 4vw, 52px)", lineHeight: 1, letterSpacing: "-0.03em" }}>03</span>
            <span className="text-[#1A1A1A] text-[10px] sm:text-[11px] font-medium tracking-[0.05em]" style={{ fontFamily: "Inter, sans-serif" }}>OUR BRAND FAMILY</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <h2 className="font-display font-extrabold text-[#1A1A1A] leading-[0.88]" style={{ fontSize: "clamp(32px, 5vw, 72px)" }}>
              One Standard.<br /><span className="text-[#F5B300]">Two Experiences.</span>
            </h2>
            <p className="text-[#888] text-[14px] leading-relaxed max-w-[320px] lg:mb-2">
              Tap each brand to explore its story — all built on the same trusted kitchen.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ minHeight: "520px" }}>
        {BRAND_DATA.map((b, i) => {
          const isActive = active === i;
          const isInactive = active !== null && !isActive;
          const logo = b.logoVariant === "pm"
            ? <PerformanceMealsLogo size="md" variant="dark" />
            : b.logoVariant === "mp"
              ? <MealPlanLogo size="md" variant="light" />
              : <ReadySeriesLogo size="md" variant="light" />;
          return (
            <div
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(isActive ? null : i)}
              className="relative overflow-hidden flex flex-col justify-between cursor-pointer"
              style={{
                backgroundColor: b.bg,
                flex: isActive ? "2.4" : isInactive ? "0.7" : "1",
                transition: "flex 0.55s cubic-bezier(0.4,0,0.2,1)",
                minHeight: "clamp(200px, 40vw, 520px)",
                padding: "clamp(28px, 4vw, 48px) clamp(20px, 3.5vw, 44px)",
              }}
            >
              <div
                className="absolute -bottom-6 -right-4 font-display font-extrabold select-none pointer-events-none"
                style={{
                  fontSize: "clamp(120px, 18vw, 220px)",
                  color: b.numColor,
                  lineHeight: 0.85,
                  transition: "opacity 0.4s ease",
                  opacity: isInactive ? 0 : 1,
                }}
              >
                {b.num}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div
                    className="h-[2px] transition-all duration-500"
                    style={{ backgroundColor: b.barColor, width: isActive ? "48px" : "32px" }}
                  />
                  <p className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: b.textDim }}>{b.tag}</p>
                </div>
                <div style={{ opacity: isInactive ? 0.5 : 1, transition: "opacity 0.4s ease" }}>
                  {logo}
                </div>
              </div>

              <div>
                <h3
                  className="font-display font-extrabold leading-tight mb-4"
                  style={{
                    color: b.accent,
                    fontSize: isActive ? "clamp(28px, 3vw, 40px)" : "clamp(22px, 2.2vw, 30px)",
                    transition: "font-size 0.4s ease",
                  }}
                >
                  {b.headline.map((line, j) => <span key={j}>{line}<br /></span>)}
                </h3>

                <div style={{
                  maxHeight: isActive ? "200px" : "0px",
                  opacity: isActive ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease",
                }}>
                  <p className="text-[14px] leading-relaxed mb-6" style={{ color: b.textDim }}>
                    {b.body}
                  </p>
                  <div className="mb-7">
                    <div className="font-display font-extrabold text-[22px] leading-none" style={{ color: b.accentHighlight }}>{b.stat.v}</div>
                    <div className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: b.textDim }}>{b.stat.l}</div>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); navigate(b.page); }}
                  className={`inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors ${b.ctaStyle}`}
                  style={{ opacity: isActive ? 1 : 0, transform: isActive ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.35s ease 0.1s, transform 0.35s ease 0.1s" }}
                >
                  {b.cta}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#1A1A1A] px-6 sm:px-10 py-5">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-white/45 text-[12px] leading-relaxed">
            <span className="text-[#F5B300] font-semibold">One trusted kitchen.</span>{" "}
            A personalised fresh-plan or a fast, flexible frozen-meal experience.
          </p>
          <div className="flex gap-6">
            {["about", "meal-plan-landing", "ready-series"].map((p, i) => (
              <button key={p} onClick={() => navigate(p as Page)}
                className="text-white/25 text-[10px] font-mono tracking-widest uppercase hover:text-white/60 transition-colors">
                {["PM", "Meal Plan", "Ready"][i]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function HomePage({ navigate, navigateToWizard }: Props) {
  const [slide, setSlide] = useState(0);
  const [phase, setPhase] = useState<ShatterPhase>("idle");
  const [heroVisible, setHeroVisible] = useState(false);
  const brandsRef = useRef<HTMLDivElement>(null);
  const [brandsVisible, setBrandsVisible] = useState(false);
  const busy = useRef(false);

  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 80); return () => clearTimeout(t); }, []);

  const changeSlide = (next: number) => {
    if (busy.current) return;
    busy.current = true;
    // 1. Shatter current image out
    setPhase("exit");
    setTimeout(() => {
      // 2. Swap slide + snap new image tiles to scatter (no transition)
      setSlide(next);
      setPhase("enter-init");
      // 3. Double RAF guarantees browser paints the scatter state before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("enter");
          setTimeout(() => {
            setPhase("idle");
            busy.current = false;
          }, 650);
        });
      });
    }, 500);
  };

  /* Auto-advance carousel */
  useEffect(() => {
    const t = setInterval(() => {
      setSlide((s) => { changeSlide((s + 1) % SLIDES.length); return s; });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = brandsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setBrandsVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const goPrev = () => changeSlide((slide - 1 + SLIDES.length) % SLIDES.length);
  const goNext = () => changeSlide((slide + 1) % SLIDES.length);

  const s = SLIDES[slide];

  return (
    <div className="bg-white text-[#1A1A1A] overflow-x-hidden">

      {/* ── CAROUSEL HERO ── */}
      <section className="relative bg-white overflow-hidden">
        {/* Mobile: stacked. Desktop: side-by-side */}
        <div className="flex flex-col lg:flex-row" style={{ minHeight: "clamp(500px, 70vh, 620px)" }}>

          {/* Text panel */}
          <div className="relative z-10 w-full lg:w-[53%] flex-shrink-0 px-6 sm:px-10 lg:px-14 py-10 lg:py-14 flex flex-col justify-between order-2 lg:order-1" style={{ minHeight: "clamp(340px, 50vw, 560px)" }}>
            <div>
              <p className="text-[#1A1A1A] text-[11px] font-medium tracking-[0.06em] mb-6 lg:mb-10" style={{ opacity: heroVisible ? 1 : 0, transition: "opacity 0.6s ease", fontFamily: "Inter, sans-serif" }}>{s.eyebrow}</p>
              <h1 className="font-display font-bold leading-[0.88] mb-5 lg:mb-6" style={{ fontSize: "clamp(32px, 5vw, 64px)", letterSpacing: "-0.03em", color: "#1A1A1A", opacity: phase === "exit" ? 0 : 1, transform: phase === "exit" ? "translateY(10px)" : "none", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
                {s.headline.map((line, i) => <span key={i} className="block">{line}</span>)}
              </h1>
              <p className="text-[#1A1A1A] leading-[1.45] mb-6 lg:mb-8 max-w-[440px]" style={{ fontSize: "clamp(13px, 1.2vw, 16px)", fontFamily: "Inter, sans-serif", opacity: phase === "exit" ? 0 : 1, transition: "opacity 0.5s ease 0.08s" }}>{s.sub}</p>
              <div className="flex flex-wrap gap-3 lg:gap-6 lg:pl-16" style={{ opacity: heroVisible ? (phase === "exit" ? 0.4 : 1) : 0, transition: "opacity 0.5s ease 0.15s" }}>
                <button
                  onClick={() => s.ctaPrimary.action === "ready-series" ? navigate("ready-series") : navigateToWizard?.()}
                  className="group relative h-12 lg:h-14 px-7 lg:px-9 bg-[#1A1A1A] text-white text-[12px] lg:text-[13px] font-semibold tracking-[0.04em] rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_8px_28px_rgba(26,26,26,0.35)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <span className="relative">{s.ctaPrimary.label}</span>
                </button>
                {s.ctaSecondary && (
                  <button
                    onClick={() => s.ctaSecondary!.action === "meal-plan" ? navigateToWizard?.() : navigate("ready-series")}
                    className="group relative h-12 lg:h-14 px-7 lg:px-9 bg-[#E85D04] text-white text-[12px] lg:text-[13px] font-semibold tracking-[0.04em] rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_8px_28px_rgba(232,93,4,0.45)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                    <span className="relative">{s.ctaSecondary.label}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="mt-8 lg:mt-14 flex flex-col gap-3" style={{ opacity: heroVisible ? 1 : 0, transition: "opacity 0.8s ease 0.6s" }}>
              <p className="text-[#7A7A75] text-[10px] lg:text-[11px] font-medium tracking-[0.034em]" style={{ fontFamily: "Inter, sans-serif" }}>ONE TRUSTED STANDARD. TWO CLEAR OFFERS.</p>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="relative h-[2px] w-[140px] lg:w-[240px] bg-[#1A1A1A]/15 rounded-full overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-[#F5B300] rounded-full transition-all duration-300" style={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }} />
                </div>
                <span className="text-[#7A7A75] text-[11px] font-medium" style={{ fontFamily: "Inter, sans-serif" }}>0{slide + 1} / 0{SLIDES.length}</span>
                <span className="text-[#7A7A75] text-[10px]" style={{ fontFamily: "Inter, sans-serif" }}>AUTO 05s</span>
              </div>
            </div>
          </div>

          {/* Yellow spine — desktop only */}
          <div className="hidden lg:block w-5 flex-shrink-0 bg-[#F5B300] z-10" />

          {/* Image panel */}
          <div className="relative w-full lg:flex-1 order-1 lg:order-2 overflow-hidden" style={{ minHeight: "240px" }}>
            <ShatterImage src={s.img} phase={phase} />
          </div>

        </div>
      </section>

      {/* ── STATS BRIDGE ── */}
      <StatsBridge />

      {/* ── 01 THE STANDARD BEHIND EVERY MEAL ── */}
      <section className="bg-[#1A1A1A] overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 px-6 sm:px-10 lg:px-14 py-10 sm:py-14 lg:py-16 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline gap-5 mb-6">
                <span className="font-display font-bold text-[#F5B300]" style={{ fontSize: "clamp(36px, 4vw, 52px)", lineHeight: 1, letterSpacing: "-0.03em" }}>01</span>
                <span className="text-[#F5B300] text-[10px] font-medium tracking-[0.05em]" style={{ fontFamily: "Inter, sans-serif" }}>THE PARENT BRAND</span>
              </div>
              <h2 className="font-display font-bold text-white mb-5" style={{ fontSize: "clamp(28px, 3.6vw, 48px)", lineHeight: 0.9, letterSpacing: "-0.023em" }}>
                <span className="block">THE STANDARD</span>
                <span className="block">BEHIND EVERY</span>
                <span className="block">MEAL.</span>
              </h2>
              <p className="text-white/80 leading-[1.48] mb-5 max-w-[420px]" style={{ fontSize: "14px", fontFamily: "Inter, sans-serif" }}>
                Performance Meals sets the purpose, quality standard and experience behind everything we offer.
              </p>
              <p className="text-[#F5B300] text-[11px] font-medium tracking-[0.04em]" style={{ fontFamily: "Inter, sans-serif" }}>PRINCIPLED  •  GROUNDED</p>
            </div>
          </div>
          <div className="relative lg:w-[55%] flex-shrink-0" style={{ minHeight: "320px" }}>
            <img src={imgChef} alt="Chef preparing meals" className="w-full h-full object-cover absolute inset-0" style={{ minHeight: "320px" }} />
            <div className="absolute bottom-0 left-0 right-0 bg-[rgba(26,26,26,0.92)] px-5 sm:px-8 py-5 sm:py-7">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  { num: "01", title: "CHEF-LED RECIPES", sub: "Craft-led food." },
                  { num: "02", title: "CLEAR NUTRITION", sub: "Visible macros & ingredients." },
                  { num: "03", title: "QUALITY CONTROL", sub: "Kitchen to doorstep." },
                ].map((p) => (
                  <div key={p.num}>
                    <p className="text-[#F5B300] text-[9px] tracking-[0.06em] mb-2" style={{ fontFamily: "Inter, sans-serif" }}>{p.num}</p>
                    <p className="text-white text-[11px] sm:text-[13px] font-medium leading-[1.1] mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{p.title}</p>
                    <p className="text-[#C2C2BA] text-[10px] sm:text-[11px] leading-[1.35] hidden sm:block" style={{ fontFamily: "Inter, sans-serif" }}>{p.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 02 CHOOSE HOW PERFORMANCE MEALS WORKS FOR YOU ── */}
      <section className="bg-[#F7F4EB] overflow-hidden py-10 sm:py-14 lg:py-16 px-6 sm:px-10 lg:px-16">
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-baseline gap-5 mb-4">
            <span className="font-display font-bold text-[#1A1A1A]" style={{ fontSize: "clamp(36px, 4vw, 52px)", lineHeight: 1, letterSpacing: "-0.03em" }}>02</span>
            <span className="text-[#1A1A1A] text-[10px] sm:text-[11px] font-medium tracking-[0.05em]" style={{ fontFamily: "Inter, sans-serif" }}>ONE STANDARD. TWO DISTINCT EXPERIENCES.</span>
          </div>

          <h2 className="font-display font-bold text-[#1A1A1A] mb-4" style={{ fontSize: "clamp(28px, 3.2vw, 42px)", lineHeight: 0.92, letterSpacing: "-0.021em" }}>
            <span className="block">CHOOSE HOW</span>
            <span className="block">PERFORMANCE MEALS</span>
            <span className="block">WORKS FOR YOU.</span>
          </h2>

          <p className="text-[#7A7A75] leading-[1.45] mb-8 max-w-[440px]" style={{ fontSize: "14px", fontFamily: "Inter, sans-serif" }}>
            Same belief. Same quality standard. Different jobs for different routines.
          </p>

          {/* Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Ready Series card */}
            <div className="group bg-[#1A1A1A] overflow-hidden flex flex-col sm:flex-row cursor-pointer" style={{ minHeight: "280px", transition: "box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 24px 60px rgba(0,0,0,0.28)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
              <div className="w-full sm:w-[42%] flex-shrink-0 relative overflow-hidden" style={{ minHeight: "200px" }}>
                <img src={imgReady} alt="Ready Series" className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105" />
              </div>
              <div className="hidden sm:block flex-shrink-0 bg-[#F5B300] transition-all duration-400 group-hover:w-[5px]" style={{ width: "3px" }} />
              <div className="flex-1 px-6 sm:px-8 py-6 sm:py-8 flex flex-col justify-between">
                <div>
                  <p className="text-[#F5B300] text-[11px] font-medium tracking-[0.06em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>READY SERIES</p>
                  <h3 className="font-display font-bold text-white mb-4" style={{ fontSize: "clamp(22px, 2.4vw, 36px)", lineHeight: 0.92, letterSpacing: "-0.018em" }}>
                    <span className="block">EVERYDAY</span>
                    <span className="block">MOMENTUM.</span>
                  </h3>
                  <p className="text-white/70 leading-[1.5] text-[14px] sm:text-[15px]" style={{ fontFamily: "Inter, sans-serif" }}>
                    Frozen convenience for changing schedules. Fast, flexible and dependable.
                  </p>
                </div>
                <button
                  onClick={() => navigate("ready-series")}
                  className="group inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.04em] text-white transition-all duration-300 pt-5 border-t border-white/15 mt-5"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <span className="relative pb-[3px] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#F5B300] after:transition-all after:duration-300 group-hover:after:w-full group-hover:text-[#F5B300]">
                    EXPLORE READY SERIES
                  </span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#F5B300]">→</span>
                </button>
              </div>
            </div>

            {/* Meal Plan card */}
            <div className="group bg-white overflow-hidden flex flex-col sm:flex-row cursor-pointer" style={{ minHeight: "280px", transition: "box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 24px 60px rgba(0,0,0,0.14)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
              <div className="w-full sm:w-[42%] flex-shrink-0 relative overflow-hidden" style={{ minHeight: "200px" }}>
                <img src={imgMeal} alt="Meal Plan" className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105" />
              </div>
              <div className="hidden sm:block flex-shrink-0 bg-[#E85D04] transition-all duration-400 group-hover:w-[5px]" style={{ width: "3px" }} />
              <div className="flex-1 px-6 sm:px-8 py-6 sm:py-8 flex flex-col justify-between">
                <div>
                  <p className="text-[#E85D04] text-[11px] font-medium tracking-[0.06em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>MEAL PLAN</p>
                  <h3 className="font-display font-bold text-[#1A1A1A] mb-4" style={{ fontSize: "clamp(22px, 2.4vw, 36px)", lineHeight: 0.92, letterSpacing: "-0.018em" }}>
                    <span className="block">BOUTIQUE</span>
                    <span className="block">PROGRESS.</span>
                  </h3>
                  <p className="text-[#1A1A1A]/60 leading-[1.5] text-[14px] sm:text-[15px]" style={{ fontFamily: "Inter, sans-serif" }}>
                    Fresh structure, personal guidance and support around a clear goal.
                  </p>
                </div>
                <button
                  onClick={() => navigateToWizard?.()}
                  className="group inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.04em] text-[#1A1A1A] transition-all duration-300 pt-5 border-t border-[#1A1A1A]/12 mt-5"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <span className="relative pb-[3px] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#E85D04] after:transition-all after:duration-300 group-hover:after:w-full group-hover:text-[#E85D04]">
                    EXPLORE MEAL PLAN
                  </span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#E85D04]">→</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 03 BRAND FAMILY ── */}
      <BrandFamilySection brandsRef={brandsRef} brandsVisible={brandsVisible} navigate={navigate} />

      {/* ── 04 CONVENIENCE WITHOUT COMPROMISE ── */}
      <section className="bg-white overflow-hidden">
        <div className="flex flex-col lg:flex-row">

          {/* Left: image */}
          <div className="lg:w-[47%] flex-shrink-0 relative" style={{ minHeight: "280px" }}>
            <img src={imgKitchen} alt="Performance Meals food" className="w-full h-full object-cover absolute inset-0" style={{ minHeight: "280px" }} />
          </div>

          {/* Yellow spine */}
          <div className="hidden lg:block w-5 flex-shrink-0 bg-[#F5B300]" />

          {/* Right: text */}
          <div className="flex-1 px-6 sm:px-10 lg:px-14 py-10 sm:py-14 lg:py-20 flex flex-col justify-center">
            {/* Number + tag */}
            <div className="flex items-baseline gap-5 mb-6">
              <span className="font-display font-bold text-[#F5B300]" style={{ fontSize: "clamp(36px, 4vw, 52px)", lineHeight: 1, letterSpacing: "-0.03em" }}>04</span>
              <span className="text-[#1A1A1A] text-[11px] font-medium tracking-[0.05em]" style={{ fontFamily: "Inter, sans-serif" }}>FOOD FIRST. PERFORMANCE FOLLOWS.</span>
            </div>

            {/* Headline */}
            <h2 className="font-display font-bold text-[#1A1A1A] mb-8" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", lineHeight: 0.92, letterSpacing: "-0.022em" }}>
              <span className="block">CONVENIENCE</span>
              <span className="block">WITHOUT</span>
              <span className="block">COMPROMISE.</span>
            </h2>

            {/* Body */}
            <p className="text-[#7A7A75] leading-[1.5] mb-8 max-w-[500px]" style={{ fontSize: "clamp(14px, 1.5vw, 17px)", fontFamily: "Inter, sans-serif" }}>
              Convenient food should still respect the ingredients, the craft and the person eating it. That principle shapes every Performance Meals experience.
            </p>

            {/* Rule */}
            <div className="h-px bg-[#1A1A1A]/13 w-full max-w-[510px] mb-7" />

            {/* Mission */}
            <p className="text-[#F5B300] text-[11px] font-medium tracking-[0.04em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>OUR MISSION</p>
            <p className="text-[#1A1A1A] leading-[1.3] max-w-[500px]" style={{ fontSize: "20px", fontFamily: "Outfit, sans-serif", fontWeight: 500, letterSpacing: "-0.003em" }}>
              To deliver exceptional meals and thoughtful support that make healthy eating easier every day.
            </p>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="bg-[#F5B300] overflow-hidden px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20 relative">
        <div className="max-w-[1380px] mx-auto flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12">

          {/* Left */}
          <div className="max-w-[700px]">
            <p className="text-[#1A1A1A] text-[11px] font-medium tracking-[0.05em] mb-5" style={{ fontFamily: "Inter, sans-serif" }}>
              PERFORMANCE MEALS
            </p>
            <h2 className="font-display font-bold text-[#1A1A1A] mb-6" style={{ fontSize: "clamp(36px, 4vw, 55px)", lineHeight: 0.92, letterSpacing: "-0.021em" }}>
              <span className="block">ONE TRUSTED STANDARD.</span>
              <span className="block">TWO WAYS TO LIVE IT.</span>
            </h2>
            <p className="text-[#1A1A1A] leading-[1.45] mb-10 max-w-[460px]" style={{ fontSize: "17px", fontFamily: "Inter, sans-serif" }}>
              Choose the experience that fits the way you want to eat.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("ready-series")}
                className="h-12 px-7 bg-[#1A1A1A] text-white text-[12px] font-medium tracking-[0.01em] rounded-full hover:bg-[#333] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                BROWSE READY SERIES
              </button>
              <button
                onClick={() => navigateToWizard?.()}
                className="h-12 px-7 bg-[#E85D04] text-white text-[12px] font-medium tracking-[0.01em] rounded-full hover:bg-[#c94e00] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                EXPLORE MEAL PLAN
              </button>
            </div>
          </div>

          {/* Right: large wordmark */}
          <div className="lg:text-right">
            <p className="text-[#1A1A1A] text-[11px] font-medium tracking-[0.04em] mb-4 lg:text-right" style={{ fontFamily: "Inter, sans-serif" }}>
              PRINCIPLED  •  GROUNDED
            </p>
            <div className="font-display font-bold text-[#1A1A1A] leading-[0.87]" style={{ fontSize: "clamp(36px, 4vw, 50px)", letterSpacing: "-0.02em" }}>
              <span className="block">PERFORMANCE</span>
              <span className="block">MEALS</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
