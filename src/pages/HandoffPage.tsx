import { Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
  navigateToWizard: (plan?: string) => void;
}

const SCREENS = [
  {
    id: "home", label: "Home", tag: "Landing", color: "#CDFF3A",
    desc: "Parent-brand entry point with brand-family routing, trust signals, story, testimonials, and two clear product paths.",
    flows: ["→ Ready Series", "→ Meal Plan", "→ About", "→ How It Works"],
  },
  {
    id: "ready-series", label: "Ready Series", tag: "Shop + Subscription", color: "#F5B300",
    desc: "Single meals, predefined bundles, and account-gated 3/6-month subscriptions. Includes Meals / Just Protein / Mixed filters, always-visible meal details, per-meal pricing, savings badges, and three client-review themes.",
    flows: ["→ Product Detail", "→ Cart", "→ Subscription Account Gate"],
  },
  {
    id: "ready-series-product", label: "Ready Series Product", tag: "Product", color: "#F5B300",
    desc: "Full meal detail with preparation, verified nutrition facts, reviews, and related meals.",
    flows: ["→ Ready Series", "→ Cart"],
  },
  {
    id: "meal-plan-wizard", label: "Meal Plan Wizard", tag: "Conversion", color: "#F2C94C",
    desc: "5-step account-gated subscription flow: programme type → plan and meal frequency → menu grouped by Mon–Tue / Wed–Thu / Fri delivery windows → details → review and account authentication.",
    flows: ["→ Confirmation (plan)"],
  },
  {
    id: "checkout", label: "Checkout", tag: "Conversion", color: "#CDFF3A",
    desc: "Ready Series checkout. 2 steps: Delivery (pre-filled from wizard if available) → Payment (card + PayNow + save card). Order summary sidebar.",
    flows: ["→ Confirmation (ready)"],
  },
  {
    id: "confirmation", label: "Order Confirmation", tag: "Post-purchase", color: "#7EE8B0",
    desc: "Confetti + success state. Live delivery timeline (5 steps). Order details. Points earned widget. Meal Plan CTA (plan orders only). Buttons differ by order type.",
    flows: ["→ Account", "→ Home / Ready Series"],
  },
  {
    id: "account", label: "My Account", tag: "Retention", color: "#A78BFA",
    desc: "5 tabs with a Meal Plan / Ready Series context toggle inside My Plan. Plan management focuses on schedule, menu, billing, pause/cancel, and subscription controls; macro content is intentionally excluded.",
    flows: ["→ Meal Plan Wizard", "→ Ready-to-Go"],
  },
  {
    id: "gift-card", label: "Gift Card", tag: "Revenue", color: "#F2C94C",
    desc: "3-step flow: Configure (amount $25/$50/$100/$150, recipient details, message, delivery method email/physical) → Payment (card + PayNow) → Confirmation (gift card preview + code).",
    flows: ["→ Home"],
  },
  {
    id: "rewards", label: "Rewards", tag: "Loyalty", color: "#7EE8B0",
    desc: "Points earning, voucher tiers, membership levels, FAQs, and links into account wallet and referral management.",
    flows: ["→ Account Wallet", "→ Account Settings"],
  },
  {
    id: "about", label: "About", tag: "Brand", color: "#F5B300",
    desc: "Performance Meals company story, values, proof points, and links into the product journeys.",
    flows: ["→ Ready Series", "→ Meal Plan"],
  },
];

const COLORS = [
  { name: "Lime Accent", hex: "#CDFF3A", use: "Ready Series, CTA buttons, highlights" },
  { name: "Gold Accent", hex: "#F2C94C", use: "Meal Plans, wizard CTA, gift card" },
  { name: "Forest Green", hex: "#0D2818", use: "Meal Plans dark overlays" },
  { name: "Near Black", hex: "#111111", use: "Primary text, nav, dark sections" },
  { name: "Off Black", hex: "#0E0E0E", use: "Page backgrounds (dark)" },
  { name: "Cream", hex: "#F7F5F0", use: "Page backgrounds (light), wizard" },
  { name: "Border", hex: "#E5E2DA", use: "Cards, dividers, inputs" },
  { name: "Mint Green", hex: "#7EE8B0", use: "Build plan accent, success states" },
  { name: "Lavender", hex: "#A78BFA", use: "Account/rewards accents" },
  { name: "Body Text", hex: "#555555", use: "Secondary copy" },
  { name: "Muted Text", hex: "#999999", use: "Labels, placeholders" },
];

const FONTS = [
  { name: "Fraunces", role: "Display / Headings", weights: "700, 900", usage: "H1–H3, prices, hero text, logo wordmark" },
  { name: "Outfit", role: "Body / UI", weights: "400, 500, 600, 700", usage: "Body copy, buttons, nav, labels, inputs" },
  { name: "JetBrains Mono", role: "Mono / Data", weights: "400, 700", usage: "Macros, prices, order IDs, tracking codes, mono labels" },
];

const COMPONENTS = [
  { name: "Nav", file: "src/components/Nav.tsx", notes: "Sticky. Promo bar. 01/02 sections. Cart drawer with stepper. 6in60 stamp badge." },
  { name: "Footer", file: "src/components/Footer.tsx", notes: "Compact single-band. Logo + nav links + contact + legal strip." },
  { name: "Cart Drawer", file: "src/components/Nav.tsx", notes: "Slide-in panel. Qty steppers. Plan items show remove-only. Checkout CTA." },
  { name: "Meal Card (Ready)", file: "src/pages/ReadySeriesPage.tsx", notes: "Image + macros grid + rating + Add/Add more button. Qty badge. Ring on item in cart." },
  { name: "Meal Card (Wizard)", file: "src/pages/MealPlanWizardPage.tsx", notes: "Large image, Recommended badge, checkmark overlay on select." },
  { name: "Plan Card (Home)", file: "src/pages/HomePage.tsx", notes: "Dark espresso bg, accent top bar, glow on hover, shimmer sweep, Most Popular badge (MAINTAIN)." },
  { name: "Plan Card (Wizard)", file: "src/pages/MealPlanWizardPage.tsx", notes: "Rounded, border select state, radio indicator, macro pills." },
  { name: "Delivery Timeline", file: "src/pages/ConfirmationPage.tsx", notes: "5-step vertical. Checkmark done / pulsing dot active / empty pending." },
  { name: "Swap Modal", file: "src/pages/AccountPage.tsx", notes: "Triggered from My Plan tab. Select new meal from grid." },
  { name: "Cancel Retention Modal", file: "src/pages/AccountPage.tsx", notes: "2-step: pause/switch alternatives → confirm cancel." },
  { name: "Review Modal", file: "src/pages/AccountPage.tsx", notes: "Star picker + text area. Triggered from Order History." },
  { name: "6in60 Stamp", file: "src/components/Nav.tsx + HomePage.tsx + MealPlanWizardPage.tsx", notes: "SVG rotating ring stamp. Appears in nav, promise bar, wizard Step 1 trust block, wizard Step 4 pre-CTA seal." },
];

const FLOWS = [
  {
    name: "Ready Series Transaction",
    color: "#CDFF3A",
    steps: ["Home → Ready-to-Go", "Browse / filter meals", "Add to cart (qty badge updates)", "Cart drawer opens", "Checkout → Delivery details", "Checkout → Payment", "Confirmation (ready type)"],
  },
  {
    name: "Meal Plan Subscription",
    color: "#F2C94C",
    steps: ["Meal Plan landing → Wizard", "Step 1: Choose recurring or fixed programme", "Step 2: Select plan and meals/day", "Step 3: Fill Mon–Tue, Wed–Thu, and Fri delivery windows", "Step 4: Delivery and contact details", "Step 5: Review → required account authentication", "Confirmation → Account"],
  },
  {
    name: "Ready Series Subscription",
    color: "#F5B300",
    steps: ["Ready Series → Subscription", "Choose Meals / Just Protein / Mixed", "Compare visible meal contents, per-meal price, and savings", "Choose 3 or 6 months", "Sign in or create account", "Subscription added to cart", "Manage in Account → My Plan → Ready Series"],
  },
  {
    name: "Build-A-Box",
    color: "#CDFF3A",
    steps: ["Home → Ready-to-Go → Build-A-Box upsell", "Select box size (5/10/15/20)", "Pick meals", "Add to cart", "Checkout", "Confirmation"],
  },
  {
    name: "Gift Card Purchase",
    color: "#F2C94C",
    steps: ["Home gift card banner OR Footer → Gift Card", "Select amount + recipient + message + delivery", "Payment (card or PayNow)", "Confirmation with gift card code"],
  },
  {
    name: "Account — Plan Customisation",
    color: "#A78BFA",
    steps: ["Account → My Plan tab", "Edit: plan / meals/day / delivery days / time / qty", "Swap individual meals (per delivery day)", "Pause or cancel subscription (retention modal)"],
  },
  {
    name: "Rewards & Referral",
    color: "#7EE8B0",
    steps: ["Home Rewards section → Join Rewards / Refer & Earn", "Account opens on Settings tab, scrolls to Invite & Earn", "Copy referral link or send email invite", "Wallet tab: redeem points for credit or free meal"],
  },
];

export default function HandoffPage({ navigate, navigateToWizard }: Props) {
  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <div className="bg-[#111] text-white px-6 py-10 border-b border-white/10">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="font-mono text-[10px] tracking-[0.4em] text-[#CDFF3A] uppercase mb-3">Developer Handoff · Figma Make Prototype · Updated October 2026</div>
              <h1 className="font-display text-[48px] font-bold leading-tight mb-2">
                PERFORMANCE MEALS<span className="text-[#CDFF3A]">.</span> Prototype
              </h1>
              <p className="text-white/45 text-[15px] max-w-xl">
                Current clickable prototype for Performance Meals. All customer-facing routes, subscription rules, user flows, design tokens, and component inventory are documented below.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-right">
              <div className="text-white/25 text-[11px] uppercase tracking-wider">Stack</div>
              <div className="font-mono text-[12px] text-white/60 space-y-1">
                <div>React 19 + TypeScript 5.7</div>
                <div>Vite 8 + Tailwind CSS v4</div>
                <div>Figma Make · performancemeals.com.sg</div>
              </div>
            </div>
          </div>

          {/* Quick nav to all screens */}
          <div className="mt-8 flex flex-wrap gap-2">
            {SCREENS.map((s) => (
              <button key={s.id} onClick={() => s.id === "meal-plan-wizard" ? navigateToWizard() : navigate(s.id as Page)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-bold tracking-[0.12em] uppercase border border-white/15 hover:border-[#CDFF3A] hover:text-[#CDFF3A] transition-colors">
                {s.label} →
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-16">

        {/* ── SCREENS ── */}
        <section>
          <SectionHeader index="01" title="All Screens" subtitle={`${SCREENS.length} pages · click any card to open live`} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCREENS.map((s) => (
              <div key={s.id} className="bg-white border border-[#E5E2DA] p-6 hover:border-[#111] transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[10px] font-mono tracking-[0.25em] uppercase mb-1" style={{ color: s.color === "#CDFF3A" ? "#888" : s.color }}>{s.tag}</div>
                    <h3 className="font-display text-[20px] font-bold">{s.label}</h3>
                  </div>
                  <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: s.color }} />
                </div>
                <p className="text-[#666] text-[12px] leading-relaxed mb-4">{s.desc}</p>
                <div className="mb-4 space-y-1">
                  {s.flows.map((f) => (
                    <div key={f} className="text-[11px] text-[#aaa] font-mono">{f}</div>
                  ))}
                </div>
                <button
                  onClick={() => s.id === "meal-plan-wizard" ? navigateToWizard() : navigate(s.id as Page)}
                  className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#111] border border-[#111] px-4 py-2 hover:bg-[#111] hover:text-white transition-colors">
                  Open Screen →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── USER FLOWS ── */}
        <section>
          <SectionHeader index="02" title="User Flows" subtitle="Key journeys mapped end-to-end" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FLOWS.map((flow) => (
              <div key={flow.name} className="bg-white border border-[#E5E2DA] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: flow.color }} />
                  <h3 className="font-semibold text-[15px]">{flow.name}</h3>
                </div>
                <div className="space-y-2">
                  {flow.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center shrink-0 mt-0.5">
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                          style={{ borderColor: flow.color, color: flow.color }}>
                          {i + 1}
                        </div>
                        {i < flow.steps.length - 1 && <div className="w-px h-4 mt-0.5" style={{ backgroundColor: flow.color + "40" }} />}
                      </div>
                      <span className="text-[13px] text-[#444] pt-0.5">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── DESIGN TOKENS ── */}
        <section>
          <SectionHeader index="03" title="Design Tokens — Colours" subtitle="All hex values ready for Shopify theme" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {COLORS.map((c) => (
              <div key={c.hex} className="bg-white border border-[#E5E2DA] overflow-hidden">
                <div className="h-14 w-full" style={{ backgroundColor: c.hex }} />
                <div className="p-4">
                  <div className="font-mono text-[13px] font-bold text-[#111] mb-0.5">{c.hex}</div>
                  <div className="text-[12px] font-semibold text-[#333] mb-1">{c.name}</div>
                  <div className="text-[11px] text-[#888] leading-snug">{c.use}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TYPOGRAPHY ── */}
        <section>
          <SectionHeader index="04" title="Typography" subtitle="Google Fonts — import in Shopify theme.liquid" />
          <div className="space-y-3">
            {FONTS.map((f) => (
              <div key={f.name} className="bg-white border border-[#E5E2DA] p-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="md:w-48 shrink-0">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-[#aaa] uppercase mb-1">{f.role}</div>
                  <div className="font-bold text-[15px] text-[#111]">{f.name}</div>
                  <div className="text-[11px] text-[#999] mt-0.5">Weights: {f.weights}</div>
                </div>
                <div className="flex-1 border-l border-[#E5E2DA] md:pl-6">
                  <div className="text-[12px] text-[#666]">{f.usage}</div>
                </div>
                <div className="font-mono text-[11px] bg-[#F7F5F0] px-3 py-1.5 text-[#555] shrink-0">
                  fonts.google.com/{f.name.replace(" ", "+")}
                </div>
              </div>
            ))}
            <div className="bg-[#111] text-white p-5 font-mono text-[12px] leading-relaxed text-white/60">
              <div className="text-[#CDFF3A] mb-2">{"/* Shopify theme.liquid <head> */"}</div>
              <div>{"<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">"}</div>
              <div>{"<link href=\"https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap\" rel=\"stylesheet\">"}</div>
            </div>
          </div>
        </section>

        {/* ── COMPONENTS ── */}
        <section>
          <SectionHeader index="05" title="Component Inventory" subtitle="All reusable UI components and their source files" />
          <div className="bg-white border border-[#E5E2DA] overflow-hidden">
            <div className="hidden md:grid grid-cols-3 gap-0 bg-[#F7F5F0] border-b border-[#E5E2DA] px-5 py-3">
              {["Component", "Source File", "Notes"].map((h) => (
                <div key={h} className="font-mono text-[10px] tracking-[0.2em] text-[#aaa] uppercase">{h}</div>
              ))}
            </div>
            {COMPONENTS.map((c, i) => (
              <div key={c.name} className={`flex flex-col md:grid md:grid-cols-3 gap-0 px-5 py-4 ${i < COMPONENTS.length - 1 ? "border-b border-[#E5E2DA]" : ""}`}>
                <div className="font-semibold text-[13px] text-[#111]">{c.name}</div>
                <div className="font-mono text-[11px] text-[#888] md:pr-4 mt-1 md:mt-0">{c.file}</div>
                <div className="text-[12px] text-[#555] leading-snug mt-1 md:mt-0">{c.notes}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SHOPIFY NOTES ── */}
        <section>
          <SectionHeader index="06" title="Shopify Build Notes" subtitle="Key decisions for the developer" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Routing",
                icon: "🔀",
                items: [
                  "9 pages — all navigable from the prototype",
                  "Shopify: use standard page templates + sections",
                  "Wizard + Checkout → custom app or Shopify Flow",
                  "Account tabs → Shopify Customer Account (+ metafields for plan data)",
                ],
              },
              {
                title: "Meal Plan Subscription",
                icon: "📦",
                items: [
                  "Use Recharge or Bold Subscriptions app",
                  "Meal Plan programme type, meal plan, and delivery-window selections stored as subscription metadata",
                  "Meal selection: custom app block storing meal IDs",
                  "Auto-charge consent captured at checkout (required field)",
                ],
              },
              {
                title: "Cart & Checkout",
                icon: "🛒",
                items: [
                  "Ready-to-Go / Build-A-Box → standard Shopify cart",
                  "Meal Plans → separate subscription checkout flow",
                  "PayNow (Singapore) → add PayNow gateway in Shopify Payments",
                  "Gift cards → Shopify built-in gift card product type",
                ],
              },
              {
                title: "Design System",
                icon: "🎨",
                items: [
                  "Two visual themes: lime+dark (Ready Series), gold+forest (Meal Plans)",
                  "Tailwind CSS v4 in prototype → port tokens to Shopify theme CSS vars",
                  "Font loading: add Google Fonts link to theme.liquid <head>",
                  "All border-radius: 0 (sharp corners) — remove Shopify Dawn rounded defaults",
                ],
              },
              {
                title: "6in60 Slogan",
                icon: "⚡",
                items: [
                  "Appears in: Nav badge, Home Promise Bar, Wizard Step 1 trust block, Wizard Step 4 pre-CTA seal",
                  "Copy: 'Lose 6kg in 60 days — or your money back'",
                  "Rotating SVG stamp: pure CSS animation (no JS library needed)",
                  "Promise bar: full-width lime (#CDFF3A) section with scrolling ticker",
                ],
              },
              {
                title: "Singapore-Specific",
                icon: "🇸🇬",
                items: [
                  "PayNow gateway: Stripe or Hitpay for SG instant bank transfer",
                  "Postal code format: 6 digits (no spaces)",
                  "Currency: SGD $ — configure in Shopify Markets",
                  "Delivery: same-day window slots (6am–9am, 9am–12pm, 12pm–3pm, 3pm–6pm)",
                ],
              },
            ].map((card) => (
              <div key={card.title} className="bg-white border border-[#E5E2DA] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[20px]">{card.icon}</span>
                  <h3 className="font-bold text-[15px]">{card.title}</h3>
                </div>
                <ul className="space-y-2">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-[#555]">
                      <span className="text-[#CDFF3A] font-bold mt-0.5 shrink-0">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <div className="border-t border-[#E5E2DA] pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#aaa]">
          <span>Performance Meals · Shopify Prototype · Figma Make · October 2026</span>
          <button onClick={() => navigate("home")} className="bg-[#111] text-white px-6 py-2.5 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-[#CDFF3A] hover:text-[#111] transition-colors">
            ← Back to Prototype
          </button>
        </div>

      </div>
    </div>
  );
}

function SectionHeader({ index, title, subtitle }: { index: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="font-mono text-[10px] tracking-[0.35em] text-[#aaa] uppercase">{index}</span>
        <div className="h-px flex-1 bg-[#E5E2DA]" />
      </div>
      <h2 className="font-display text-[28px] font-bold text-[#111]">{title}</h2>
      <p className="text-[#999] text-[13px] mt-0.5">{subtitle}</p>
    </div>
  );
}
