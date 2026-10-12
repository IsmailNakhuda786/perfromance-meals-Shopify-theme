import { Page } from "@/data";
import { PerformanceMealsLogo, MealPlanLogo, ReadySeriesLogo } from "@/components/Logos";

interface Props {
  navigate: (page: Page) => void;
  navigateToWizard: (plan?: string) => void;
}

export default function AboutPage({ navigate, navigateToWizard }: Props) {
  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">

      {/* ── HERO ── */}
      <section className="bg-[#1A1A1A] text-white">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="mb-8">
              <PerformanceMealsLogo size="lg" variant="dark" />
            </div>
            <p className="text-[11px] font-mono tracking-[0.45em] uppercase text-[#F5B300] mb-5">About Performance Meals</p>
            <h1 className="font-display text-[44px] sm:text-[60px] font-extrabold leading-[0.92] mb-6">
              Nutrition that works<br />
              <span className="text-[#F5B300]">as hard as you do.</span>
            </h1>
            <p className="text-white/55 text-[16px] leading-relaxed max-w-lg">
              Performance Meals is the parent brand behind two distinct customer experiences — both built on one shared standard of quality, care, and honest nutrition.
            </p>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1547592180-85f173990554?w=700&h=500&fit=crop&auto=format"
              alt="Real food for real routines"
              className="w-full object-cover"
              style={{ height: 420 }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-24"
              style={{ background: "linear-gradient(to top, rgba(26,26,26,0.9), transparent)" }} />
          </div>
        </div>
      </section>

      {/* ── PURPOSE / MISSION ── */}
      <section className="bg-[#FAF9F6] border-b border-[#E8E4DC]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 sm:py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-[10px] font-mono tracking-[0.45em] uppercase text-[#F5B300] mb-3">Parent Purpose</p>
            <p className="font-display text-[20px] font-semibold text-[#1A1A1A] leading-snug">
              To make exceptional meal prep accessible to every customer, with care in every experience.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono tracking-[0.45em] uppercase text-[#aaa] mb-3">Mission</p>
            <p className="text-[#555] text-[15px] leading-relaxed">
              To deliver exceptional meals and thoughtful support that make healthy eating easier every day.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono tracking-[0.45em] uppercase text-[#aaa] mb-3">What we believe</p>
            <p className="text-[#555] text-[15px] leading-relaxed">
              Healthy eating is realistic support for a fuller life — not a punishment. We focus on consistency and progress rather than perfection.
            </p>
          </div>
        </div>
      </section>

      {/* ── ONE STANDARD. TWO DISTINCT EXPERIENCES. ── */}
      <section className="py-20 sm:py-28 border-b border-[#E8E4DC]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10">
          <div className="mb-14">
            <p className="text-[11px] font-mono tracking-[0.45em] uppercase text-[#F5B300] mb-4">The brand architecture</p>
            <h2 className="font-display text-[38px] sm:text-[52px] font-extrabold text-[#1A1A1A] leading-[0.93] mb-5">
              One Standard.<br />Two Distinct Experiences.
            </h2>
            <p className="text-[#666] text-[16px] leading-relaxed max-w-[600px]">
              Performance Meals sets the performance and quality standard. Meal Plan and Ready-Series then serve two very different customer needs — from the same trusted kitchen.
            </p>
          </div>

          {/* Architecture diagram */}
          <div className="border border-[#E8E4DC] mb-3">
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4 border-b border-[#E8E4DC]">
              <div className="md:col-span-1">
                <PerformanceMealsLogo size="md" variant="dark" />
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-mono tracking-[0.35em] uppercase text-[#aaa] mb-2">The Gold Standard</p>
                <p className="font-display text-[18px] font-semibold text-[#1A1A1A]">Shared food quality, performance standards, and brand trust across every offer.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Meal Plan */}
              <div className="p-8 border-b md:border-b-0 md:border-r border-[#E8E4DC]">
                <div className="h-[3px] bg-[#E85D04] mb-6" />
                <div className="mb-4">
                  <MealPlanLogo size="sm" variant="light" />
                </div>
                <p className="text-[10px] font-mono tracking-[0.4em] uppercase mb-2" style={{ color: "#E85D04" }}>When a customer needs a plan</p>
                <p className="font-display text-[18px] font-semibold text-[#1A1A1A] mb-2">Fresh structure for a personal goal.</p>
                <p className="text-[#666] text-[13px] leading-relaxed">
                  <strong>Delivers:</strong> Fresh meals, a regular plan, and personal guidance.
                </p>
              </div>
              {/* Ready-Series */}
              <div className="p-8">
                <div className="h-[3px] bg-[#F5B300] mb-6" />
                <div className="mb-4">
                  <ReadySeriesLogo size="sm" variant="light" />
                </div>
                <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-[#F5B300] mb-2">When life needs flexibility</p>
                <p className="font-display text-[18px] font-extrabold text-[#1A1A1A] mb-2">Frozen convenience for everyday momentum.</p>
                <p className="text-[#666] text-[13px] leading-relaxed">
                  <strong>Delivers:</strong> Freezer-ready meals, fast prep, and easy repeat choices.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] px-6 py-5">
            <p className="text-white/55 text-[13px] leading-relaxed">
              <span className="text-[#F5B300] font-semibold uppercase tracking-wider text-[10px] mr-3">Relationship in one line</span>
              One trusted standard — delivered through a <strong className="text-white">personalised fresh-plan experience</strong> or a <strong className="text-white">fast, flexible frozen-meal experience.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── MEAL PLAN SECTION ── */}
      <section className="py-20 sm:py-28 border-b border-[#E8E4DC]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="h-[3px] bg-[#E85D04] w-16 mb-8" />
            <div className="mb-6">
              <MealPlanLogo size="md" variant="light" />
            </div>
            <p className="text-[10px] font-mono tracking-[0.45em] uppercase mb-4" style={{ color: "#E85D04" }}>Boutique Progress</p>
            <h2 className="font-display text-[34px] sm:text-[44px] font-semibold text-[#1A1A1A] leading-[0.93] mb-5">
              Planned for your goal.<br />Delivered fresh.
            </h2>
            <p className="text-[#555] text-[15px] leading-relaxed mb-6">
              For busy, goal-oriented people who want more than a generic healthy-food routine. Meal Plan combines exceptional meals with tailored support — making sustainable progress easier to build into everyday life.
            </p>
            <div className="space-y-3 mb-8">
              {[
                "Fresh meals prepared and delivered to a personal plan",
                "Structured nutrition built around a real goal",
                "Personal support — not just a menu",
                "Practical guidance for meaningful progress",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <div className="w-[3px] h-[3px] rounded-full mt-[8px] shrink-0" style={{ backgroundColor: "#E85D04" }} />
                  <p className="text-[#555] text-[14px]">{point}</p>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("meal-plan-landing")}
              className="inline-flex items-center gap-3 text-white text-[11px] font-bold tracking-[0.2em] uppercase px-7 py-4 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#E85D04" }}>
              Discover Meal Plan
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>

          <div>
            <img
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&h=520&fit=crop&auto=format"
              alt="Fresh meal prep — premium plating and personal attention"
              className="w-full object-cover"
              style={{ height: 440 }}
            />
          </div>
        </div>
      </section>

      {/* ── READY-SERIES SECTION ── */}
      <section className="py-20 sm:py-28 border-b border-[#E8E4DC] bg-[#1A1A1A] text-white">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div className="order-2 lg:order-1">
            <img
              src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&h=520&fit=crop&auto=format"
              alt="Ready-Series — fast, enjoyable frozen meals for everyday life"
              className="w-full object-cover"
              style={{ height: 440 }}
            />
          </div>

          <div className="order-1 lg:order-2">
            <div className="h-[3px] bg-[#F5B300] w-16 mb-8" />
            <div className="mb-6">
              <ReadySeriesLogo size="md" variant="dark" />
            </div>
            <p className="text-[10px] font-mono tracking-[0.45em] uppercase text-[#F5B300] mb-4">Everyday Momentum</p>
            <h2 className="font-display text-[34px] sm:text-[44px] font-extrabold text-white leading-[0.93] mb-5">
              FROZEN AT PEAK.<br />READY ON DEMAND.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-6">
              For busy people who want a fast, dependable, and accessible way to eat better. Ready-Series is the frozen performance-meal system that makes it easy to choose, heat, enjoy, and stay on track — whenever life gets busy.
            </p>
            <div className="space-y-3 mb-8">
              {[
                "Frozen at peak nutritional freshness",
                "Ready in minutes — zero prep required",
                "Dependable freezer stock for unpredictable days",
                "Clear individual, bundle, and stock-up pricing",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <div className="w-[3px] h-[3px] rounded-full mt-[8px] shrink-0 bg-[#F5B300]" />
                  <p className="text-white/60 text-[14px]">{point}</p>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("ready-series")}
              className="inline-flex items-center gap-3 bg-[#F5B300] text-[#1A1A1A] text-[11px] font-extrabold tracking-[0.2em] uppercase px-7 py-4 hover:bg-white transition-colors">
              Shop Ready-Series
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── CLOSING — ONE PERFORMANCE STANDARD ── */}
      <section className="py-20 sm:py-24 bg-[#FAF9F6] border-b border-[#E8E4DC]">
        <div className="max-w-[900px] mx-auto px-6 sm:px-10 text-center">
          <div className="h-px bg-[#F5B300] w-16 mx-auto mb-10" />
          <p className="text-[11px] font-mono tracking-[0.45em] uppercase text-[#F5B300] mb-6">One connected brand family</p>
          <h2 className="font-display text-[34px] sm:text-[48px] font-extrabold text-[#1A1A1A] leading-[0.93] mb-6">
            One Performance Standard.<br />
            <span className="text-[#555] font-semibold">Two distinct experiences.</span>
          </h2>
          <p className="text-[#666] text-[16px] leading-relaxed max-w-[560px] mx-auto mb-10">
            Whether you need the structure and personal support of Meal Plan, or the flexible convenience of Ready-Series — every meal begins with the same standard of quality that Performance Meals was built to uphold.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("meal-plan-landing")}
              className="inline-flex items-center justify-center gap-3 text-white text-[11px] font-bold tracking-[0.2em] uppercase px-7 py-4 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#E85D04" }}>
              Discover Meal Plan
            </button>
            <button onClick={() => navigate("ready-series")}
              className="inline-flex items-center justify-center gap-3 bg-[#1A1A1A] text-white text-[11px] font-extrabold tracking-[0.2em] uppercase px-7 py-4 hover:bg-[#F5B300] hover:text-[#1A1A1A] transition-colors">
              Shop Ready-Series
            </button>
          </div>
          <div className="h-px bg-[#F5B300] w-16 mx-auto mt-10" />
        </div>
      </section>

    </div>
  );
}
