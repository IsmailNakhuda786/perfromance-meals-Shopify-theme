import { Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
  navigateToWizard: (plan?: string) => void;
}

const COLORS = [
  { name: "Lime Charge", hex: "#CDFF3A", use: "Primary CTA, badges, accents" },
  { name: "Midnight", hex: "#111111", use: "Nav, dark sections, buttons" },
  { name: "Espresso", hex: "#1C1508", use: "Meal plan background" },
  { name: "Gold", hex: "#F2C94C", use: "Maintain plan, wizard accents" },
  { name: "Mint", hex: "#7EE8B0", use: "Build plan, success states" },
  { name: "Parchment", hex: "#F7F5F0", use: "Page backgrounds, cards" },
  { name: "Stone", hex: "#D0CCC4", use: "Borders, dividers" },
  { name: "Forest", hex: "#1A3324", use: "Newsletter section" },
];

const SCREENS: { title: string; label: string; desc: string; color: string; accent: string; page: Page | null; wizard?: string }[] = [
  { title: "01", label: "Home", desc: "Hero split, promise bar, plan cards, rewards, newsletter", color: "#111", accent: "#CDFF3A", page: "home" },
  { title: "02", label: "Ready Series", desc: "Meals, bundles, account-gated subscriptions, three review themes", color: "#1A1A1A", accent: "#F5B300", page: "ready-series" },
  { title: "03", label: "Ready Series Product", desc: "Meal details, preparation, nutrition, reviews, related meals", color: "#1A1A1A", accent: "#F5B300", page: "ready-series-product" },
  { title: "04", label: "Meal Plan Landing", desc: "Goal selection, process, frequency, proof, conversion CTAs", color: "#14100A", accent: "#E85D04", page: "meal-plan-landing" },
  { title: "05", label: "Meal Plan Wizard", desc: "5-step account-gated flow with grouped delivery windows", color: "#14100A", accent: "#E85D04", page: "meal-plan-wizard" },
  { title: "06", label: "Checkout", desc: "Auth choice, delivery, payment, wallet, promo", color: "#1A1A1A", accent: "#F5B300", page: "checkout" },
  { title: "07", label: "Confirmation", desc: "Order confirmed, loyalty points earned, next steps", color: "#0D1F0F", accent: "#7EE8B0", page: "confirmation" },
  { title: "08", label: "My Account", desc: "Dashboard plus Meal Plan / Ready Series management contexts", color: "#111", accent: "#F5B300", page: "account" },
  { title: "09", label: "Gift Cards", desc: "Configure → payment → confirmation", color: "#111", accent: "#F2C94C", page: "gift-card" },
  { title: "10", label: "Rewards", desc: "Points, vouchers, membership tiers, FAQ", color: "#111", accent: "#7EE8B0", page: "rewards" },
  { title: "11", label: "About", desc: "Brand story, values, proof, and product paths", color: "#111", accent: "#F5B300", page: "about" },
];

const FLOWS = [
  {
    title: "Ready Series Transaction",
    color: "#CDFF3A",
    steps: ["Home", "Ready-to-Go", "Cart", "Checkout", "Confirmation"],
  },
  {
    title: "Meal Plan Subscription",
    color: "#E85D04",
    steps: ["Meal Plan Landing", "Type", "Plan & Meals", "Mon–Tue / Wed–Thu / Fri Menu", "Details", "Review + Account", "Confirmation"],
  },
  {
    title: "Ready Series Subscription",
    color: "#F5B300",
    steps: ["Ready Series", "Subscription", "Meals / Just Protein / Mixed", "3 or 6 Months", "Account Gate", "Cart", "Account Management"],
  },
  {
    title: "Build-A-Box",
    color: "#7EE8B0",
    steps: ["Home", "Build-A-Box", "Size → Meals → Cart", "Checkout", "Confirmation"],
  },
  {
    title: "Gift Card Flow",
    color: "#CDFF3A",
    steps: ["Home / Nav", "Gift Card Page", "Configure → Payment", "Email Delivery"],
  },
  {
    title: "Referral & Rewards",
    color: "#F2C94C",
    steps: ["Home (Rewards Section)", "Account → Settings", "Referral Link", "Wallet Credit"],
  },
  {
    title: "Account Management",
    color: "#7EE8B0",
    steps: ["Nav → My Account", "Dashboard", "Orders / Wallet / Settings", "Edit & Save"],
  },
];

const FONTS = [
  { name: "Fraunces", role: "Display / Headings", weight: "700–800", sample: "PERFORMANCE.", size: "text-[32px]" },
  { name: "Outfit", role: "Body / UI", weight: "400–600", sample: "Chef-prepared. Macro-precise.", size: "text-[18px]" },
  { name: "JetBrains Mono", role: "Data / Labels", weight: "400–700", sample: "PRO 42g · CARB 55g", size: "text-[15px] font-mono" },
];

export default function BlueprintPage({ navigate, navigateToWizard }: Props) {
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#111]">

      {/* Header */}
      <div className="bg-[#111] text-white px-6 sm:px-10 py-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="text-[10px] font-mono tracking-[0.4em] text-white/30 uppercase mb-3">Client Blueprint · v1.0</div>
              <h1 className="font-display text-[40px] sm:text-[56px] font-bold leading-none">
                PERFORMANCE MEALS<span className="text-[#CDFF3A]">.</span>
              </h1>
              <p className="text-white/50 text-[15px] mt-2">Shopify Prototype — Design & Flow Documentation</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { n: "14", l: "Screens" },
                { n: "7", l: "User Flows" },
                { n: "100%", l: "Mobile Ready" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-[28px] font-bold text-[#CDFF3A]">{s.n}</div>
                  <div className="text-[11px] text-white/40 tracking-wider uppercase">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand promise */}
          <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row gap-6 sm:gap-12 text-[13px]">
            {[
              { l: "Brand", v: "Performance Meals" },
              { l: "Market", v: "Singapore · performancemeals.com.sg" },
              { l: "Platform", v: "Shopify (to be built)" },
              { l: "Promise", v: "Lose 6kg in 60 days — guaranteed" },
            ].map((i) => (
              <div key={i.l}>
                <div className="text-white/35 text-[10px] tracking-widest uppercase mb-0.5">{i.l}</div>
                <div className="text-white/80">{i.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-12 space-y-16">

        {/* ── SCREENS ── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#111] text-white text-[12px] font-bold flex items-center justify-center shrink-0">A</div>
            <h2 className="font-display text-[28px] font-bold">All Screens</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCREENS.map((s) => (
              <button
                key={s.label}
                onClick={() => s.wizard ? navigateToWizard(s.wizard) : s.page && navigate(s.page)}
                className="text-left group border border-[#E5E2DA] bg-white hover:border-[#111] transition-all overflow-hidden"
              >
                {/* Preview swatch */}
                <div className="h-24 relative flex items-end p-4" style={{ backgroundColor: s.color }}>
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: s.accent }}>{s.title}</span>
                  <span className="absolute top-3 right-3 text-[10px] text-white/20 group-hover:text-white/50 transition-colors">View →</span>
                </div>
                <div className="p-4">
                  <div className="font-bold text-[15px] mb-1">{s.label}</div>
                  <div className="text-[12px] text-[#888] leading-relaxed">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── USER FLOWS ── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#111] text-white text-[12px] font-bold flex items-center justify-center shrink-0">B</div>
            <h2 className="font-display text-[28px] font-bold">User Flows</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FLOWS.map((f) => (
              <div key={f.title} className="bg-white border border-[#E5E2DA] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                  <span className="font-semibold text-[14px]">{f.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {f.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="bg-[#F7F5F0] border border-[#E5E2DA] px-2.5 py-1 text-[11px] text-[#444] rounded">{step}</span>
                      {i < f.steps.length - 1 && <span className="text-[#CCC] text-[12px]">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── COLOUR PALETTE ── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#111] text-white text-[12px] font-bold flex items-center justify-center shrink-0">C</div>
            <h2 className="font-display text-[28px] font-bold">Colour Palette</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COLORS.map((c) => (
              <div key={c.hex} className="bg-white border border-[#E5E2DA] overflow-hidden">
                <div className="h-16" style={{ backgroundColor: c.hex }} />
                <div className="p-3">
                  <div className="font-semibold text-[13px]">{c.name}</div>
                  <div className="font-mono text-[11px] text-[#888] mt-0.5">{c.hex}</div>
                  <div className="text-[11px] text-[#aaa] mt-1 leading-tight">{c.use}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TYPOGRAPHY ── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#111] text-white text-[12px] font-bold flex items-center justify-center shrink-0">D</div>
            <h2 className="font-display text-[28px] font-bold">Typography</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FONTS.map((f) => (
              <div key={f.name} className="bg-white border border-[#E5E2DA] p-6">
                <div className="text-[10px] font-mono tracking-[0.3em] text-[#999] uppercase mb-4">{f.role}</div>
                <div className={`font-bold leading-tight mb-4 ${f.size} ${f.name === "Fraunces" ? "font-display" : f.name === "JetBrains Mono" ? "font-mono" : "font-body"}`}>
                  {f.sample}
                </div>
                <div className="border-t border-[#F0EDE8] pt-3 space-y-1">
                  <div className="text-[12px] font-semibold">{f.name}</div>
                  <div className="text-[11px] text-[#888]">Weight: {f.weight}</div>
                  <div className="text-[11px] text-[#888]">Source: Google Fonts</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── KEY FEATURES ── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#111] text-white text-[12px] font-bold flex items-center justify-center shrink-0">E</div>
            <h2 className="font-display text-[28px] font-bold">Key Features for Shopify Build</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "🛒", title: "Cart & Checkout", desc: "Persistent cart drawer, wallet credit, PayNow + card, address save, auto-charge consent" },
              { icon: "📦", title: "Subscription Plans", desc: "Meal Plan and Ready Series subscriptions, account-gated checkout, grouped delivery windows, and separate account management contexts" },
              { icon: "🎁", title: "Gift Cards", desc: "Configurable amounts, digital delivery via email, 3-step checkout" },
              { icon: "🏆", title: "Rewards & Wallet", desc: "Points per order, referral system, wallet balance applied at checkout" },
              { icon: "👤", title: "Account Portal", desc: "Order history, active plans, wallet, referral link, address book, saved cards" },
              { icon: "📱", title: "Mobile Responsive", desc: "Fully optimised for all screen sizes — hamburger nav, stacked layouts, touch-friendly" },
              { icon: "⚡", title: "6in60 Promise Bar", desc: "Animated stamp badge, money-back guarantee, wired across all key conversion points" },
              { icon: "🔒", title: "Secure Payments", desc: "Stripe card, PayNow, auto-charge authorisation, save card for faster checkout" },
              { icon: "📊", title: "Nutrition Data", desc: "Full macros per meal, plan calorie targets, per-meal category filters" },
            ].map((f) => (
              <div key={f.title} className="bg-white border border-[#E5E2DA] p-5">
                <div className="text-[24px] mb-3">{f.icon}</div>
                <div className="font-semibold text-[14px] mb-1">{f.title}</div>
                <div className="text-[12px] text-[#888] leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER NAV ── */}
        <div className="border-t border-[#E5E2DA] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[12px] text-[#999]">Performance Meals · Prototype Blueprint v2.0 · October 2026 · Confidential</div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={() => navigate("home")}
              className="border border-[#D0CCC4] px-4 py-2 text-[11px] tracking-[0.15em] uppercase text-[#555] hover:border-[#111] hover:text-[#111] transition-colors">
              View Prototype
            </button>
            <button onClick={() => navigate("handoff")}
              className="bg-[#111] text-white px-4 py-2 text-[11px] tracking-[0.15em] uppercase hover:bg-[#CDFF3A] hover:text-[#111] transition-colors">
              Dev Handoff →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
