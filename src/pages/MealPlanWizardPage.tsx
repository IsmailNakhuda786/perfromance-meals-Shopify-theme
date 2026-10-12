import { useState, useMemo } from "react";
import { MEALS, Page } from "@/data";
import { MealPlanLogo } from "@/components/Logos";

interface Props {
  navigate: (page: Page) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addToCart?: (item: any) => void;
  initialPlan: string;
  onCheckoutComplete: (addr: { name: string; phone: string; line1: string; unit: string; postal: string }, total: number) => void;
}

type ProgrammeType = "bi-weekly" | "monthly" | "2-months" | "6by60" | "6by60plus";
type MealPlanType = "Low Carb Regular" | "Low Carb Regular+" | "Balance Regular" | "Balance Regular+";
type MealCount = "lunch-only" | "lunch-dinner";
type Step = 1 | 2 | 3 | 4 | 5;
type AuthMode = null | "signin" | "signup" | "done";

const STEP_LABELS = ["Type", "Plan & Meals", "Menu", "Your Details", "Review"];
const STEP_SUBTITLES = [
  "Recurring subscription or fixed programme?",
  "Choose your meal type and daily frequency",
  "Select meals from this week's kitchen menu",
  "Delivery address and contact details",
  "Review, apply discounts and place order",
];

const PROGRAMME_DETAILS: Record<ProgrammeType, {
  label: string; description: string; kind: "recurring" | "fixed";
  days?: number; menuWeeks: number; badge?: string; icon: string; fixedMealCount?: MealCount;
}> = {
  "bi-weekly":  { label: "Biweekly",     description: "Mon–Fri coverage · renews every 2 weeks",     kind: "recurring", menuWeeks: 2, badge: "POPULAR", icon: "🔄" },
  "monthly":    { label: "Monthly",      description: "Mon–Fri coverage · renews every month",        kind: "recurring", menuWeeks: 4, icon: "📅" },
  "2-months":   { label: "2 Months",     description: "Mon–Fri coverage · renews every 2 months",     kind: "recurring", menuWeeks: 4, icon: "🗓" },
  "6by60":      { label: "6 by 60",      description: "60-day programme · All-week coverage · 6kg+ weight-loss goal", kind: "fixed", days: 60, menuWeeks: 4, icon: "🎯", fixedMealCount: "lunch-dinner" as MealCount },
  "6by60plus":  { label: "6 by 60 Plus", description: "60-day programme · All-week coverage · Weight loss + muscle support", kind: "fixed", days: 60, menuWeeks: 4, icon: "⚡", fixedMealCount: "lunch-dinner" as MealCount },
};

const MEAL_PLANS: { id: MealPlanType; kcal: string; note: string; protein: string; carb: string; icon: string }[] = [
  { id: "Low Carb Regular",  kcal: "400–450 kcal", note: "Most popular · balanced low-carb macros",  protein: "42g", carb: "22g", icon: "🥗" },
  { id: "Low Carb Regular+", kcal: "450–500 kcal", note: "Enhanced low-carb · higher protein",       protein: "48g", carb: "22g", icon: "🥗" },
  { id: "Balance Regular",   kcal: "500–550 kcal", note: "Higher energy · performance fuel",         protein: "48g", carb: "55g", icon: "💪" },
  { id: "Balance Regular+",  kcal: "550–600 kcal", note: "Maximum performance · muscle support",     protein: "54g", carb: "58g", icon: "💪" },
];

const BASE_PRICES: Record<MealPlanType, Record<MealCount, number>> = {
  "Low Carb Regular":  { "lunch-only": 140, "lunch-dinner": 200 },
  "Low Carb Regular+": { "lunch-only": 155, "lunch-dinner": 215 },
  "Balance Regular":   { "lunch-only": 150, "lunch-dinner": 220 },
  "Balance Regular+":  { "lunch-only": 165, "lunch-dinner": 235 },
};

const VALID_PROMOS: Record<string, { discount: number; flat?: number; expired?: boolean }> = {
  "WELCOME10": { discount: 0.10 },
  "WELCOME15": { discount: 0.15 },
  "SUMMER20":  { discount: 0.20, expired: true },
  "FITLIFE":   { discount: 0.12 },
  "READY20":   { discount: 0.20 },
  "SG61":      { discount: 0, flat: 6.10 },
  "FREEZER5":  { discount: 0, flat: 5.00 },
};

// Generate the next 4 Mon–Fri delivery weeks from today
function buildWeeks() {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today = new Date();
  // advance to the nearest upcoming Monday (or today if it's Monday)
  const dow = today.getDay(); // 0=Sun
  const daysUntilMon = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + daysUntilMon);
  return Array.from({ length: 4 }, (_, i) => {
    const wMon = new Date(mon); wMon.setDate(mon.getDate() + i * 7);
    const wFri = new Date(wMon); wFri.setDate(wMon.getDate() + 4);
    const start = `${wMon.getDate()} ${MONTHS[wMon.getMonth()]}`;
    const end   = wFri.getMonth() === wMon.getMonth()
      ? `${wFri.getDate()}`
      : `${wFri.getDate()} ${MONTHS[wFri.getMonth()]}`;
    return { label: `Week ${i + 1}`, dates: `${start}–${end}` };
  });
}
const WEEKS = buildWeeks();

const WEEK_MENUS: Array<{ lunch: number[]; dinner: number[] }> = [
  { lunch: [1, 7],  dinner: [4, 9] },
  { lunch: [2, 5],  dinner: [6, 4] },
  { lunch: [3, 8],  dinner: [1, 5] },
  { lunch: [7, 9],  dinner: [2, 6] },
];

function getMeal(id: number) { return MEALS.find((m) => m.id === id) ?? MEALS[0]; }

// Delivery windows — Mon-Tue, Wed-Thu, Fri
const DELIVERY_WINDOWS = [
  { key: "mon-tue", label: "Mon – Tue", days: "Monday & Tuesday",      dayCount: 2 },
  { key: "wed-thu", label: "Wed – Thu", days: "Wednesday & Thursday",   dayCount: 2 },
  { key: "fri",     label: "Fri",       days: "Friday",                 dayCount: 1 },
];

// WindowSelections[weekIdx][windowKey] = array of selected meal IDs (can repeat)
type WindowSelections = Record<number, Record<string, number[]>>;

// ── Reusable selection card ──────────────────────────────────────────────────
function SelectCard({
  selected, onClick, icon, title, sub, badge, right, accent = "#E85D04",
}: {
  selected: boolean; onClick: () => void; icon?: string; title: string; sub?: string;
  badge?: string; right?: React.ReactNode; accent?: string;
}) {
  return (
    <button onClick={onClick}
      className={`relative w-full text-left flex items-center gap-4 px-5 py-4 border-2 transition-all duration-150 group
        ${selected ? "border-[#E85D04] bg-white" : "border-[#E8E4DC] bg-white hover:border-[#C0BAB0]"}`}
      style={selected ? { boxShadow: `0 0 0 3px ${accent}22` } : undefined}>
      {/* Left accent strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-150"
        style={{ backgroundColor: selected ? accent : "transparent" }} />
      {icon && (
        <div className={`text-2xl shrink-0 transition-all duration-150 ${selected ? "scale-110" : "opacity-60 group-hover:opacity-100"}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold text-[15px] transition-colors ${selected ? "text-[#1A1A1A]" : "text-[#444]"}`}>{title}</span>
          {badge && <span className="bg-[#E85D04] text-white text-[9px] font-extrabold tracking-[0.15em] uppercase px-2 py-0.5">{badge}</span>}
        </div>
        {sub && <div className="text-[12px] text-[#888] mt-0.5">{sub}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
      <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150
        ${selected ? "border-[#E85D04] bg-[#E85D04]" : "border-[#D0CCC4] group-hover:border-[#999]"}`}>
        {selected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6 9 17l-5-5"/></svg>}
      </div>
    </button>
  );
}

// ── Meal selection card for delivery window ───────────────────────────────────
function WindowMealCard({ meal, count, onClick, atMax }: {
  meal: typeof MEALS[0]; count: number; onClick: () => void; atMax: boolean;
}) {
  const selected = count > 0;
  return (
    <button onClick={onClick}
      className={`relative w-full text-left overflow-hidden border-2 transition-all duration-150 group
        ${selected ? "border-[#E85D04]" : atMax ? "border-[#E8E4DC] opacity-50" : "border-[#E8E4DC] hover:border-[#C0BAB0]"}`}
      style={selected ? { boxShadow: "0 0 0 3px #E85D0422" } : undefined}>
      <div className="relative h-28 overflow-hidden">
        <img src={meal.img} alt={meal.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        {selected && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-[#E85D04] rounded-full flex items-center justify-center font-bold text-white text-[13px]">
            {count}
          </div>
        )}
      </div>
      <div className="p-2.5 bg-white">
        <div className="font-semibold text-[11px] leading-tight text-[#1A1A1A]">{meal.name}</div>
        <div className="flex gap-1.5 mt-0.5 text-[9px] text-[#888]">
          <span>{meal.cal} kcal</span><span>·</span><span>P {meal.protein}g</span>
        </div>
      </div>
    </button>
  );
}

// ── Field input ───────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#888] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-[#D0CCC4] bg-white text-[#1A1A1A] px-4 py-3 text-[14px] placeholder:text-[#C0BAB0] focus:outline-none focus:border-[#E85D04] focus:shadow-[0_0_0_3px_rgba(232,93,4,0.12)] transition-all";

// Map landing-page goal label → wizard defaults
function goalDefaults(goal: string): { programme: ProgrammeType; mealPlan: MealPlanType } {
  if (goal === "CUT")    return { programme: "6by60",     mealPlan: "Low Carb Regular" };
  if (goal === "BUILD")  return { programme: "6by60plus", mealPlan: "Balance Regular"  };
  return                        { programme: "bi-weekly", mealPlan: "Balance Regular"  };
}

export default function MealPlanWizardPage({ navigate, initialPlan, onCheckoutComplete }: Props) {
  const defaults = goalDefaults(initialPlan ?? "");
  const [step, setStep] = useState<Step>(1);
  const [programme, setProgramme] = useState<ProgrammeType>(defaults.programme);
  const [mealPlan, setMealPlan] = useState<MealPlanType>(defaults.mealPlan);
  const [mealCount, setMealCount] = useState<MealCount>("lunch-dinner");
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [openWindow, setOpenWindow] = useState<string | null>("mon-tue");
  const [menuSelections, setMenuSelections] = useState<WindowSelections>({});
  const [details, setDetails] = useState({ name: "", phone: "", email: "", street: "", city: "", postcode: "", notes: "" });

  // Auth (Meal Plan requires account — no guest)
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [waName, setWaName] = useState("");
  const [waEmail, setWaEmail] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waPass, setWaPass] = useState("");

  // Promo & wallet
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<"invalid" | "expired" | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const WALLET_BALANCE = 12.00; // simulated wallet

  const progInfo = PROGRAMME_DETAILS[programme];
  const effectiveMealCount = progInfo.fixedMealCount ?? mealCount;
  const basePrice = BASE_PRICES[mealPlan][effectiveMealCount];

  const promoEntry = promoApplied ? VALID_PROMOS[promoCode.trim().toUpperCase()] : null;
  const promoDiscount = promoEntry
    ? promoEntry.flat ? promoEntry.flat : basePrice * promoEntry.discount
    : 0;
  const walletDiscount = useWallet ? Math.min(WALLET_BALANCE, basePrice - promoDiscount) : 0;
  const afterDiscounts = Math.max(0, basePrice - promoDiscount - walletDiscount);
  const gst = afterDiscounts * 0.06;
  const total = afterDiscounts + gst;
  const pointsEarned = Math.round(basePrice * 1.5);

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const entry = VALID_PROMOS[code];
    if (!entry) { setPromoError("invalid"); setPromoApplied(false); return; }
    if (entry.expired) { setPromoError("expired"); setPromoApplied(false); return; }
    setPromoError(null); setPromoApplied(true);
  };

  const slotsPerDay = effectiveMealCount === "lunch-dinner" ? 2 : 1;
  const weekSels = menuSelections[selectedWeek] || {};

  // Window-based slot accounting: Mon-Tue = 2 days, Wed-Thu = 2 days, Fri = 1 day
  const windowEntitlement = (w: typeof DELIVERY_WINDOWS[0]) => w.dayCount * slotsPerDay;
  const totalSlots = DELIVERY_WINDOWS.reduce((s, w) => s + windowEntitlement(w), 0);
  const filledSlots = DELIVERY_WINDOWS.reduce((s, w) => s + (weekSels[w.key] || []).length, 0);
  const windowDoneMap = DELIVERY_WINDOWS.map((w) => (weekSels[w.key] || []).length >= windowEntitlement(w));

  const completionPct = useMemo(() => {
    if (step === 3) return Math.min(40 + Math.round((filledSlots / totalSlots) * 20), 59);
    return Math.min((step - 1) * 20, 100);
  }, [step, filledSlots, totalSlots]);

  const selectWindowMeal = (windowKey: string, mealId: number, entitlement: number) => {
    setMenuSelections((prev) => {
      const wk = prev[selectedWeek] || {};
      const wSel = wk[windowKey] || [];
      let next: number[];
      const lastIdx = wSel.lastIndexOf(mealId);
      if (lastIdx >= 0) {
        next = [...wSel.slice(0, lastIdx), ...wSel.slice(lastIdx + 1)];
      } else if (wSel.length < entitlement) {
        next = [...wSel, mealId];
      } else {
        return prev;
      }
      return { ...prev, [selectedWeek]: { ...wk, [windowKey]: next } };
    });
  };
  // Next upcoming Sunday (first delivery day)
  const startDate = (() => {
    const d = new Date();
    const daysUntilSun = (7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSun);
    return d;
  })();
  const endDate = progInfo.days ? new Date(startDate.getTime() + (progInfo.days - 1) * 86400000) : null;
  const fmtDate = (d: Date) => d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });

  const canProceed4 = !!(details.name && details.phone && details.email && details.street);
  const progLabel = progInfo.kind === "fixed" && progInfo.days ? `${progInfo.label} · ${progInfo.days} days` : progInfo.label;
  const mealCountLabel = effectiveMealCount === "lunch-only" ? "Lunch Only · 1/day" : "Lunch & Dinner · 2/day";

  const goBack = () => step === 1 ? navigate("meal-plan-landing") : setStep((s) => (s - 1) as Step);
  const goNext = () => setStep((s) => Math.min(s + 1, 5) as Step);

  // Meal pool for current week (combined lunch + dinner options, deduplicated)
  const weekPool = WEEK_MENUS[selectedWeek] ?? WEEK_MENUS[0];
  const mealPool = [...new Set([...weekPool.lunch, ...weekPool.dinner])].map(getMeal);

  // ── Nav buttons shared across steps ──────────────────────────────────────
  const NavButtons = ({ onNext, nextLabel = "Continue", nextDisabled = false }: {
    onNext?: () => void; nextLabel?: string; nextDisabled?: boolean;
  }) => (
    <div className="flex gap-3 pt-2">
      <button onClick={goBack}
        className="flex items-center gap-2 border-2 border-[#1A1A1A] text-[#1A1A1A] px-6 py-3.5 font-bold text-[14px] hover:bg-[#1A1A1A] hover:text-white transition-all active:scale-[0.98]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back
      </button>
      <button onClick={onNext ?? goNext} disabled={nextDisabled}
        className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-bold text-[15px] tracking-wide transition-all active:scale-[0.98]
          ${nextDisabled ? "bg-[#E8E4DC] text-[#C0BAB0] cursor-not-allowed" : "bg-[#E85D04] text-white hover:bg-[#1A1A1A]"}`}>
        {nextLabel}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen text-[#1A1A1A]" style={{ backgroundColor: "#F4F2EE" }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#E8E4DC] sticky top-0 z-30">
        <div className="h-0.5 bg-[#F4F2EE]">
          <div className="h-full bg-[#E85D04] transition-all duration-700 ease-out" style={{ width: `${completionPct}%` }} />
        </div>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center gap-6 py-3">
          <button onClick={() => navigate("meal-plan-landing")} className="shrink-0">
            <MealPlanLogo size="sm" variant="light" />
          </button>
          <div className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {STEP_LABELS.map((label, i) => {
              const s = (i + 1) as Step;
              const done = s < step; const active = s === step;
              return (
                <div key={label} className="flex items-center gap-0.5 shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold transition-all
                    ${active ? "text-[#E85D04] bg-[#FFF9F5]" : done ? "text-[#555]" : "text-[#C0BAB0]"}`}>
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0
                      ${active || done ? "bg-[#E85D04] text-white" : "border border-[#D0CCC4] text-[#C0BAB0]"}`}>
                      {done ? "✓" : s}
                    </span>
                    {label}
                  </div>
                  {i < STEP_LABELS.length - 1 && <div className={`w-8 h-px ${s < step ? "bg-[#E85D04]" : "bg-[#E0DCD6]"}`} />}
                </div>
              );
            })}
          </div>
          <div className="md:hidden flex-1 text-[13px] font-semibold text-[#666] text-center">{step} / 5 · {STEP_LABELS[step - 1]}</div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-bold text-[#E85D04]">{completionPct}%</span>
            <button onClick={goBack} className="text-[12px] text-[#888] hover:text-[#1A1A1A] font-medium transition-colors hidden sm:block">← Back</button>
          </div>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 lg:py-10 flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">

        {/* ── MAIN ── */}
        <div className="flex-1 min-w-0 max-w-[720px]">
          {/* Step header */}
          <div className="mb-7">
            <span className="text-[11px] font-extrabold tracking-[0.3em] uppercase text-[#E85D04]">
              {String(step).padStart(2, "0")} / {String(STEP_LABELS.length).padStart(2, "0")}
            </span>
            <h1 className="text-[32px] sm:text-[38px] font-extrabold leading-tight tracking-tight mt-1">{STEP_LABELS[step - 1]}</h1>
            <p className="text-[#888] text-[14px] mt-1">{STEP_SUBTITLES[step - 1]}</p>
          </div>

          {/* ════ STEP 1: TYPE ════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3">Recurring Subscription</p>
                <div className="space-y-2">
                  {(["bi-weekly", "monthly", "2-months"] as ProgrammeType[]).map((t) => {
                    const info = PROGRAMME_DETAILS[t];
                    const weekLabel = t === "bi-weekly" ? "2 weekly menus" : "4 weekly menus";
                    return (
                      <SelectCard key={t} selected={programme === t} onClick={() => setProgramme(t)}
                        icon={info.icon} title={info.label} sub={info.description} badge={info.badge}
                        right={<span className="text-[11px] text-[#888]">{weekLabel}</span>}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-[#E8E4DC]"/><span className="text-[11px] font-bold text-[#C0BAB0] tracking-widest">OR</span><div className="flex-1 h-px bg-[#E8E4DC]"/>
              </div>
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3">Fixed-Period Programme</p>
                <div className="space-y-2">
                  {(["6by60", "6by60plus"] as ProgrammeType[]).map((t) => {
                    const info = PROGRAMME_DETAILS[t];
                    return (
                      <SelectCard key={t} selected={programme === t} onClick={() => setProgramme(t)}
                        icon={info.icon} title={info.label} sub={info.description}
                        right={<span className="text-[11px] font-semibold text-[#E85D04]">{info.days} days</span>}
                      />
                    );
                  })}
                </div>
              </div>
              <NavButtons />
            </div>
          )}

          {/* ════ STEP 2: PLAN & MEALS ════ */}
          {step === 2 && (
            <div className="space-y-7">
              {/* WHAT'S INCLUDED — predefined, grey, read-only */}
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3">What's Included</p>
                <div className="border border-[#E8E4DC] bg-[#F7F5F0] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-[#888]">Programme</span>
                    <span className="text-[13px] font-bold text-[#555]">{progInfo.label}</span>
                  </div>
                  <div className="h-px bg-[#E8E4DC]" />
                  <p className="text-[12px] text-[#888] leading-relaxed">{progInfo.description}</p>
                  {progInfo.kind === "fixed" && progInfo.days && (
                    <div className="flex gap-4 text-[12px] text-[#888]">
                      <span>Duration: <strong className="text-[#555]">{progInfo.days} days</strong></span>
                      <span>All-week coverage: <strong className="text-[#555]">Mon–Fri</strong></span>
                    </div>
                  )}
                  {programme === "6by60plus" && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#888]">Also includes</p>
                      {["Frozen weekend meals", "Channel access", "Weigh-in machine", "Rewards"].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-[12px] text-[#666]">
                          <div className="w-1 h-1 bg-[#E85D04] shrink-0" />{item}
                        </div>
                      ))}
                    </div>
                  )}
                  {progInfo.kind === "fixed" && (
                    <>
                      <div className="h-px bg-[#E8E4DC]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-[#888]">Plan Type</span>
                        <span className="text-[13px] font-bold text-[#555]">{mealPlan}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-[#E8E4DC]" />
                  <p className="text-[11px] text-[#AAA] italic">Plan type and meals are predefined for this programme. Meal selection is in the next step.</p>
                </div>
              </div>

              {/* Meal type — shown as selectable only for recurring */}
              {progInfo.kind === "recurring" && (
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3">Meal Type &amp; Size</p>
                <div className="grid grid-cols-1 gap-2">
                  {MEAL_PLANS.map((plan) => (
                    <SelectCard key={plan.id} selected={mealPlan === plan.id} onClick={() => setMealPlan(plan.id)}
                      icon={plan.icon} title={plan.id}
                      sub={`${plan.kcal} · ${plan.note}`}
                      right={
                        <div className="text-right">
                          <div className="text-[11px] font-bold text-[#1A1A1A]">P {plan.protein}</div>
                          <div className="text-[10px] text-[#888]">C {plan.carb}</div>
                        </div>
                      }
                    />
                  ))}
                </div>
              </div>
              )}

              {/* Meals per day */}
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3">Meals Per Day</p>
                {progInfo.fixedMealCount ? (
                  <div className="border-2 border-[#E85D04] bg-white p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">🌙</span>
                      <div>
                        <div className="font-bold text-[15px] text-[#1A1A1A]">Lunch & Dinner</div>
                        <div className="text-[12px] text-[#888]">2 meals · included in programme</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-1.5 h-1.5 bg-[#E85D04]" />
                      <span className="text-[11px] text-[#888]">Meal count is fixed for the <strong className="text-[#1A1A1A]">{progInfo.label}</strong> programme</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { id: "lunch-only"   as MealCount, label: "Lunch Only",     sub: "1 meal · midday fuel",       icon: "☀️", price: BASE_PRICES[mealPlan]["lunch-only"] },
                      { id: "lunch-dinner" as MealCount, label: "Lunch & Dinner", sub: "2 meals · full-day covered",  icon: "🌙", price: BASE_PRICES[mealPlan]["lunch-dinner"] },
                    ]).map((opt) => {
                      const sel = mealCount === opt.id;
                      return (
                        <button key={opt.id} onClick={() => setMealCount(opt.id)}
                          className={`p-5 border-2 text-left transition-all duration-150 group active:scale-[0.99]
                            ${sel ? "border-[#E85D04] bg-white" : "border-[#E8E4DC] bg-white hover:border-[#C0BAB0]"}`}
                          style={sel ? { boxShadow: "0 0 0 3px #E85D0422" } : undefined}>
                          <div className="text-3xl mb-3">{opt.icon}</div>
                          <div className={`font-bold text-[15px] ${sel ? "text-[#1A1A1A]" : "text-[#555]"}`}>{opt.label}</div>
                          <div className="text-[12px] text-[#888] mt-0.5">{opt.sub}</div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[13px] font-extrabold text-[#E85D04]">${opt.price}</span>
                            {sel && <span className="text-[10px] font-bold text-[#E85D04] flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                              Selected
                            </span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Points earn teaser */}
              <div className="flex items-center gap-3 bg-[#1A1A1A] text-white px-5 py-4">
                <span className="text-2xl">🪙</span>
                <div>
                  <p className="font-bold text-[14px]">
                    Earn <span className="text-[#F5B300]">+{pointsEarned} pts</span> on this order
                  </p>
                  <p className="text-white/50 text-[12px]">Redeem for free meals and discounts</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[11px] text-white/40">From</div>
                  <div className="text-[18px] font-extrabold text-[#F5B300]">${basePrice}</div>
                </div>
              </div>
              <NavButtons />
            </div>
          )}

          {/* ════ STEP 3: MENU ════ */}
          {step === 3 && (
            <div>
              {/* Week tabs — biweekly shows 2 weeks, monthly/2-months shows 4 weeks */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {WEEKS.slice(0, progInfo.menuWeeks).map((w, i) => (
                  <button key={i} onClick={() => { setSelectedWeek(i); setOpenWindow("mon-tue"); }}
                    className={`flex flex-col items-center px-5 py-3 border-2 shrink-0 transition-all font-semibold
                      ${selectedWeek === i ? "border-[#E85D04] bg-[#E85D04] text-white" : "border-[#E8E4DC] bg-white text-[#888] hover:border-[#C0BAB0]"}`}>
                    <span className="text-[13px]">{w.label}</span>
                    <span className="text-[10px] opacity-70 font-normal">{w.dates}</span>
                  </button>
                ))}
              </div>

              {/* Window progress summary bar */}
              <div className="bg-white border border-[#E8E4DC] px-5 py-3.5 mb-4 flex items-center gap-4">
                <div className="flex gap-3 flex-1">
                  {DELIVERY_WINDOWS.map((w, i) => {
                    const done = windowDoneMap[i];
                    const ent = windowEntitlement(w);
                    const filled = (weekSels[w.key] || []).length;
                    return (
                      <button key={w.key} onClick={() => setOpenWindow(openWindow === w.key ? null : w.key)}
                        className={`flex flex-col items-center gap-1 px-3 py-2 border-2 transition-all text-center
                          ${done ? "border-[#E85D04] bg-[#FFF9F5]"
                            : openWindow === w.key ? "border-[#E85D04] bg-white"
                            : "border-[#E8E4DC] bg-white hover:border-[#C0BAB0]"}`}>
                        <span className={`text-[11px] font-extrabold ${done ? "text-[#E85D04]" : openWindow === w.key ? "text-[#E85D04]" : "text-[#C0BAB0]"}`}>
                          {w.label}
                        </span>
                        <span className="text-[9px] font-mono text-[#aaa]">
                          {done ? "✓ done" : `${filled}/${ent}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-right shrink-0 border-l border-[#E8E4DC] pl-4">
                  <div className="text-[18px] font-extrabold text-[#1A1A1A]">{filledSlots}<span className="text-[#C0BAB0] font-normal text-[14px]">/{totalSlots}</span></div>
                  <div className="text-[10px] text-[#888] uppercase tracking-wide">meals chosen</div>
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 bg-[#FFFBF0] border-l-4 border-[#F5B300] px-4 py-3 mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F5B300" strokeWidth="2" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <p className="text-[12px] text-[#666] leading-relaxed">
                  <strong className="text-[#1A1A1A]">Select meals by delivery window.</strong> Tap a meal to add it — you can pick the same meal multiple times to fill your allocation. Tap again to remove.
                </p>
              </div>

              {/* Delivery window accordions */}
              <div className="space-y-2 mb-6">
                {DELIVERY_WINDOWS.map((w, wi) => {
                  const isOpen = openWindow === w.key;
                  const ent = windowEntitlement(w);
                  const wSel = weekSels[w.key] || [];
                  const done = windowDoneMap[wi];
                  return (
                    <div key={w.key} className={`border-2 transition-all duration-200 bg-white ${isOpen ? "border-[#E85D04]" : "border-[#E8E4DC] hover:border-[#C0BAB0]"}`}>
                      <button onClick={() => setOpenWindow(isOpen ? null : w.key)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left">
                        <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-extrabold transition-all border-2
                          ${done ? "bg-[#E85D04] border-[#E85D04] text-white" : isOpen ? "border-[#E85D04] text-[#E85D04]" : "border-[#E8E4DC] text-[#C0BAB0]"}`}>
                          {done ? "✓" : wi + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[15px]">{w.days}</span>
                            {done && !isOpen && <span className="text-[11px] text-[#E85D04] font-semibold">Complete ✓</span>}
                          </div>
                          <div className="text-[11px] text-[#aaa] mt-0.5">
                            {done ? wSel.map((id) => getMeal(id).name).join(" · ") : `${wSel.length} of ${ent} meals chosen`}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-[10px] font-mono font-bold px-2 py-1 ${done ? "bg-[#E85D04]/10 text-[#E85D04]" : "bg-[#F4F2EE] text-[#aaa]"}`}>
                            {wSel.length}/{ent}
                          </span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"
                          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 border-t border-[#F4F2EE]">
                          <div className="flex items-center justify-between mt-4 mb-3">
                            <p className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#888]">
                              Choose {ent} meal{ent !== 1 ? "s" : ""} — can repeat
                            </p>
                            <span className="text-[10px] font-mono text-[#E85D04] font-bold">{wSel.length}/{ent} selected</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {mealPool.map((meal) => {
                              const count = wSel.filter((id) => id === meal.id).length;
                              const atMax = wSel.length >= ent && count === 0;
                              return (
                                <WindowMealCard key={meal.id} meal={meal} count={count} atMax={atMax}
                                  onClick={() => selectWindowMeal(w.key, meal.id, ent)} />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <NavButtons nextDisabled={!windowDoneMap.every(Boolean)} />
            </div>
          )}

          {/* ════ STEP 4: DETAILS ════ */}
          {step === 4 && (
            <div className="space-y-7">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-4">Personal Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <Field label="Full Name">
                    <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })}
                      placeholder="Alex Johnson" className={inputCls} />
                  </Field>
                  <Field label="Phone / WhatsApp">
                    <input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                      placeholder="+60 12-345 6789" className={inputCls} />
                  </Field>
                </div>
                <Field label="Email Address">
                  <input value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })}
                    type="email" placeholder="alex@email.com" className={inputCls} />
                </Field>
              </div>

              <div>
                <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3">Delivery Address</p>
                <div className="flex items-center gap-3 bg-[#1A1A1A] text-white px-4 py-3 mb-4">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E85D04" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <span className="text-[13px] font-semibold">Delivery schedule:</span>
                  <span className="text-white/60 text-[13px]">Dates assigned based on your programme</span>
                </div>
                <div className="space-y-3">
                  <Field label="Street Address">
                    <input value={details.street} onChange={(e) => setDetails({ ...details, street: e.target.value })}
                      placeholder="123 Jalan Ampang" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City">
                      <input value={details.city} onChange={(e) => setDetails({ ...details, city: e.target.value })}
                        placeholder="Kuala Lumpur" className={inputCls} />
                    </Field>
                    <Field label="Postcode">
                      <input value={details.postcode} onChange={(e) => setDetails({ ...details, postcode: e.target.value })}
                        placeholder="50450" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Delivery Notes (optional)">
                    <textarea value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                      placeholder="Leave at door, call on arrival..." rows={3}
                      className={`${inputCls} resize-none`} />
                  </Field>
                </div>
              </div>
              <NavButtons nextDisabled={!canProceed4} />
            </div>
          )}

          {/* ════ STEP 5: REVIEW & PAY ════ */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Account gate — no guest checkout */}
              {authMode === null && (
                <div>
                  <div className="bg-[#1A1A1A] text-white p-5 mb-5 flex items-start gap-4">
                    <span className="text-3xl shrink-0">🪙</span>
                    <div>
                      <p className="font-bold text-[15px] mb-0.5">
                        Earn <span className="text-[#F5B300]">+{pointsEarned} reward points</span> on this order
                      </p>
                      <p className="text-white/50 text-[12px]">Redeem for free meals, discounts, and referral bonuses. Requires an account.</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3">Account Required</p>
                  <p className="text-[14px] text-[#555] mb-5">Meal Plans are subscription-based and require an account to manage your weekly menu, deliveries, and earn rewards.</p>
                  <div className="space-y-2">
                    <button onClick={() => setAuthMode("signup")}
                      className="w-full bg-[#E85D04] text-white py-4 font-bold text-[15px] hover:bg-[#1A1A1A] transition-colors flex items-center justify-center gap-2">
                      Create Account & Subscribe
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                    <button onClick={() => setAuthMode("signin")}
                      className="w-full border-2 border-[#1A1A1A] text-[#1A1A1A] py-4 font-bold text-[15px] hover:bg-[#1A1A1A] hover:text-white transition-colors">
                      Sign In to Existing Account
                    </button>
                  </div>
                  <div className="pt-2">
                    <button onClick={goBack} className="flex items-center gap-2 text-[13px] text-[#888] hover:text-[#1A1A1A] font-semibold transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* Sign Up */}
              {authMode === "signup" && (
                <div>
                  <button onClick={() => setAuthMode(null)} className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#111] mb-5 font-semibold">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    Back
                  </button>
                  <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-1">Create Account</p>
                  <p className="text-[#555] text-[14px] mb-5">Takes 30 seconds — earn points from day one.</p>
                  <div className="space-y-3 mb-5">
                    <Field label="Full Name"><input value={waName} onChange={(e) => setWaName(e.target.value)} placeholder="Your name" className={inputCls} /></Field>
                    <Field label="Email"><input value={waEmail} onChange={(e) => setWaEmail(e.target.value)} type="email" placeholder="your@email.com" className={inputCls} /></Field>
                    <Field label="Phone (for WhatsApp updates)"><input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} type="tel" placeholder="+60 12-345 6789" className={inputCls} /></Field>
                    <Field label="Password"><input value={waPass} onChange={(e) => setWaPass(e.target.value)} type="password" placeholder="Create password" className={inputCls} /></Field>
                  </div>
                  <button disabled={!waName || !waEmail || !waPass} onClick={() => setAuthMode("done")}
                    className="w-full bg-[#E85D04] text-white py-4 font-bold text-[15px] hover:bg-[#1A1A1A] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                    Continue to Payment
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              )}

              {/* Sign In */}
              {authMode === "signin" && (
                <div>
                  <button onClick={() => setAuthMode(null)} className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#111] mb-5 font-semibold">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    Back
                  </button>
                  <p className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-1">Sign In</p>
                  <p className="text-[#555] text-[14px] mb-5">Welcome back — let us activate your plan.</p>
                  <div className="space-y-3 mb-5">
                    <Field label="Email"><input value={waEmail} onChange={(e) => setWaEmail(e.target.value)} type="email" placeholder="your@email.com" className={inputCls} /></Field>
                    <Field label="Password"><input value={waPass} onChange={(e) => setWaPass(e.target.value)} type="password" placeholder="Your password" className={inputCls} /></Field>
                  </div>
                  <button disabled={!waEmail || !waPass} onClick={() => setAuthMode("done")}
                    className="w-full bg-[#1A1A1A] text-white py-4 font-bold text-[15px] hover:bg-[#E85D04] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                    Sign In & Continue
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              )}

              {/* Payment + order summary */}
              {authMode === "done" && (
                <div className="space-y-4">
                  {/* Order summary */}
                  <div className="bg-white border border-[#E8E4DC] overflow-hidden">
                    <div className="px-5 py-3 bg-[#F4F2EE] border-b border-[#E8E4DC]">
                      <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#888]">Your Order</p>
                    </div>
                    {[
                      ["Programme", progLabel],
                      ["Meal Plan", mealPlan],
                      ["Meals", mealCountLabel],
                      ["Menu", `${progInfo.menuWeeks} weekly menus`],
                      ...(progInfo.days ? [["Duration", `${progInfo.days} days`], ["Start", fmtDate(startDate)], ["End", endDate ? fmtDate(endDate) : "—"]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center px-5 py-3 border-b border-[#F4F2EE] last:border-b-0">
                        <span className="text-[13px] text-[#666]">{k}</span>
                        <span className="text-[13px] font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Promo code */}
                  <div className="bg-white border border-[#E8E4DC] px-5 py-4">
                    <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#888] mb-3">Promo / Discount Code</p>
                    <div className="flex gap-2">
                      <input value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); setPromoError(null); }}
                        placeholder="e.g. WELCOME10"
                        className={`flex-1 border bg-white px-4 py-3 text-[14px] font-mono uppercase focus:outline-none transition-all
                          ${promoApplied ? "border-green-400 bg-green-50" : promoError ? "border-red-400" : "border-[#D0CCC4] focus:border-[#E85D04] focus:shadow-[0_0_0_3px_rgba(232,93,4,0.12)]"}`}
                      />
                      <button onClick={handleApplyPromo}
                        className="px-5 py-3 bg-[#1A1A1A] text-white text-[12px] font-bold tracking-widest uppercase hover:bg-[#E85D04] transition-colors">
                        Apply
                      </button>
                    </div>
                    {promoApplied && <p className="text-green-600 text-[12px] mt-2 font-semibold">✓ {promoCode} applied — saving ${promoDiscount.toFixed(2)}</p>}
                    {promoError === "invalid" && <p className="text-red-500 text-[12px] mt-2">✕ Invalid promo code. Check spelling or try another.</p>}
                    {promoError === "expired" && <p className="text-red-500 text-[12px] mt-2">⏰ This promo code has expired.</p>}
                  </div>

                  {/* Wallet credit */}
                  <div className="bg-white border border-[#E8E4DC] px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#888] mb-0.5">Wallet Credit</p>
                        <p className="font-bold text-[15px]">${WALLET_BALANCE.toFixed(2)} available</p>
                        {useWallet && <p className="text-[12px] text-green-600 font-semibold mt-0.5">−${walletDiscount.toFixed(2)} applied</p>}
                      </div>
                      <button onClick={() => setUseWallet(!useWallet)}
                        className={`relative w-12 h-6 transition-colors duration-200 ${useWallet ? "bg-[#E85D04]" : "bg-[#E8E4DC]"}`}
                        style={{ borderRadius: 999 }}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white shadow transition-all duration-200 ${useWallet ? "left-6" : "left-0.5"}`} style={{ borderRadius: 999 }} />
                      </button>
                    </div>
                  </div>

                  {/* Reward points earned */}
                  <div className="bg-[#1A1A1A] text-white px-5 py-4 flex items-center gap-4">
                    <span className="text-2xl">🪙</span>
                    <div className="flex-1">
                      <p className="font-bold text-[14px]">Earn <span className="text-[#F5B300]">+{pointsEarned} points</span> on this order</p>
                      <p className="text-white/50 text-[11px]">Added to your account after first delivery</p>
                    </div>
                    <div className="text-right text-[11px] text-white/40">
                      <p>Current balance</p>
                      <p className="text-[#F5B300] font-bold text-[13px]">1,234 pts</p>
                    </div>
                  </div>

                  {/* Pricing breakdown */}
                  <div className="bg-white border border-[#E8E4DC] overflow-hidden">
                    <div className="px-5 py-3 bg-[#F4F2EE] border-b border-[#E8E4DC]">
                      <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#888]">Cost Breakdown</p>
                    </div>
                    <div className="flex justify-between px-5 py-3 border-b border-[#F4F2EE]">
                      <span className="text-[13px] text-[#666]">{progInfo.days ? `${progInfo.days}-day programme` : progInfo.label}</span>
                      <span className="text-[13px]">${basePrice.toFixed(2)}</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between px-5 py-3 border-b border-[#F4F2EE]">
                        <span className="text-[13px] text-green-600">Promo ({promoCode})</span>
                        <span className="text-[13px] text-green-600">−${promoDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {useWallet && (
                      <div className="flex justify-between px-5 py-3 border-b border-[#F4F2EE]">
                        <span className="text-[13px] text-green-600">Wallet credit</span>
                        <span className="text-[13px] text-green-600">−${walletDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-5 py-3 border-b border-[#F4F2EE]">
                      <span className="text-[13px] text-[#666]">Delivery</span>
                      <span className="text-[13px]">Free</span>
                    </div>
                    <div className="flex justify-between px-5 py-3 border-b border-[#F4F2EE]">
                      <span className="text-[13px] text-[#666]">GST (6%)</span>
                      <span className="text-[13px]">${gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center px-5 py-4 bg-[#1A1A1A]">
                      <span className="text-white font-bold text-[15px]">Total</span>
                      <span className="text-[#F5B300] font-extrabold text-[22px]">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="bg-white border border-[#E8E4DC] px-5 py-4">
                    <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#888] mb-3">Payment Method</p>
                    <div className="border-2 border-[#E85D04] bg-[#FFF9F5] px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 bg-[#1A1A1A] flex items-center justify-center shrink-0">
                          <svg width="20" height="13" viewBox="0 0 30 20" fill="none">
                            <rect width="30" height="20" fill="#333"/>
                            <rect x="2" y="7" width="26" height="3" fill="#666"/>
                            <rect x="2" y="13" width="8" height="2" rx="0.5" fill="#999"/>
                          </svg>
                        </div>
                        <span className="font-semibold text-[14px]">Credit / Debit Card</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E85D04" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                  </div>

                  {/* Trust + CTA */}
                  <div className="flex items-center gap-3 bg-[#E85D04]/10 border border-[#E85D04]/30 px-4 py-3">
                    <span className="text-xl shrink-0">🔒</span>
                    <p className="text-[12px] text-[#555] leading-tight">
                      <strong className="text-[#1A1A1A]">Satisfaction guarantee.</strong> Exceptional meals and support — or your money back. No questions asked.
                    </p>
                  </div>

                  <button onClick={() => onCheckoutComplete({ name: details.name, phone: details.phone, line1: details.street, unit: "", postal: details.postcode }, total)}
                    className="w-full bg-[#E85D04] text-white py-4 font-bold text-[16px] tracking-wide hover:bg-[#1A1A1A] transition-colors active:scale-[0.99] flex items-center justify-center gap-2">
                    Place Order · ${total.toFixed(2)}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                  <p className="text-center text-[12px] text-[#aaa]">Cancel anytime from your account · No lock-in</p>

                  <div className="pt-2">
                    <button onClick={goBack} className="flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#1A1A1A] font-semibold transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                      Back to Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── YOUR ORDER — SIDEBAR ── */}
        <div className="lg:w-[360px] xl:w-[380px] shrink-0 w-full">
          <div className="sticky top-[60px]">
            <div className="bg-[#1A1A1A] text-white overflow-hidden">

              {/* Sidebar header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E85D04" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="1"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <span className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#666]">Your Order</span>
                </div>
                <span className="text-[11px] font-bold text-[#E85D04]">{completionPct}% complete</span>
              </div>

              {/* Progress bar */}
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex justify-between text-[9px] font-bold mb-2">
                  {[20, 40, 60, 80, 100].map((m) => (
                    <span key={m} className={completionPct >= m ? "text-[#E85D04]" : "text-white/20"}>{m}%</span>
                  ))}
                </div>
                <div className="h-2 bg-white/10 overflow-hidden" style={{ borderRadius: 0 }}>
                  <div className="h-full bg-gradient-to-r from-[#F5B300] to-[#E85D04] transition-all duration-700 ease-out"
                    style={{ width: `${completionPct}%` }} />
                </div>
                <p className="text-[10px] text-white/30 mt-2">
                  {completionPct < 100 ? `${100 - completionPct}% left to complete your plan` : "Plan complete!"}
                </p>
              </div>

              {/* Reward points teaser */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F5B300] flex items-center justify-center text-xl shrink-0">🪙</div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-[#555] mb-0.5">Reward Points</p>
                  <p className="text-[14px] font-bold">Earn <span className="text-[#F5B300]">+{pointsEarned} pts</span> on this order</p>
                  <p className="text-[10px] text-white/30">Current balance: 1,234 pts</p>
                </div>
              </div>

              {/* Wallet credit — only shown at checkout step */}
              {step === 5 && (
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-[#555] mb-0.5">Wallet Credit</p>
                    <p className="text-[14px] font-bold text-[#F5B300]">${WALLET_BALANCE.toFixed(2)}</p>
                    <p className="text-[10px] text-white/30">Available to use</p>
                  </div>
                  <button onClick={() => setUseWallet(!useWallet)}
                    className={`relative w-11 h-6 transition-colors duration-200 ${useWallet ? "bg-[#E85D04]" : "bg-white/20"}`}
                    style={{ borderRadius: 999 }}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white shadow transition-all duration-200 ${useWallet ? "left-5" : "left-0.5"}`} style={{ borderRadius: 999 }} />
                  </button>
                </div>
              )}

              {/* Order details */}
              <div className="px-6 py-4 space-y-3 text-[13px] border-b border-white/10">
                <div>
                  <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[#555] mb-0.5">Step {step} of 5</p>
                  <p className="font-semibold">{STEP_LABELS[step - 1]}</p>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[#555] mb-0.5">{progInfo.kind === "recurring" ? "Subscription" : "Programme"}</p>
                  <p className="font-semibold">{progLabel}</p>
                </div>
                {progInfo.days && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[#555] mb-0.5">Period</p>
                    <p className="font-semibold">{progInfo.days} days</p>
                  </div>
                )}
                {step >= 2 && (
                  <>
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[#555] mb-0.5">Meal Plan</p>
                      <p className="font-semibold">{mealPlan}</p>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[#555] mb-0.5">Frequency</p>
                      <p className="font-semibold">{mealCountLabel}</p>
                    </div>
                  </>
                )}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E85D04" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[#555]">Delivery</p>
                  </div>
                  <p className="font-semibold text-[12px]">ASSIGNED BASED ON YOUR PROGRAMME</p>
                </div>
              </div>

              {/* Price footer */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-extrabold tracking-[0.15em] uppercase text-[#555] mb-0.5">Total incl. GST</p>
                  <p className="text-[24px] font-extrabold text-[#F5B300] leading-none">${total.toFixed(2)}</p>
                  {(promoApplied || useWallet) && (
                    <p className="text-[10px] text-white/40 line-through mt-0.5">${(basePrice * 1.06).toFixed(2)}</p>
                  )}
                </div>
                <div className="text-right text-[10px] text-white/30 leading-relaxed">
                  <p>Free delivery</p>
                  <p>Cancel anytime</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
