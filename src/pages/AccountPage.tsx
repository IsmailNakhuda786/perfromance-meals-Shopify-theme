import { useEffect, useState } from "react";
import { MEALS, Page, PLANS } from "@/data";

function BoxSubscriptionCard({ navigate, save }: { navigate: (page: Page) => void; save: (msg: string) => void }) {
  const [active, setActive] = useState(true);
  const [paused, setPaused] = useState(false);

  if (!active) return null;

  const nextDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  })();

  return (
    <div className="bg-white border border-[#E5E2DA]">
      <div className="p-5 border-b border-[#E5E2DA] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[20px]">📦</span>
          <div>
            <h3 className="font-medium text-[15px]">Ready Series Subscription</h3>
            <p className="text-[#888] text-[12px] mt-0.5">Ready Series · Predefined subscription product</p>
          </div>
        </div>
        <div className={`px-3 py-1 text-[10px] font-mono font-bold tracking-[0.2em] uppercase ${paused ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-[#F5B300]/10 text-[#1A1A1A] border border-[#F5B300]/30"}`}>
          {paused ? "⏸ Paused" : "● Active"}
        </div>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Product",      val: `Low Carb Meals · Non-Beef` },
            { label: "Items",        val: "10 items per delivery" },
            { label: "Term",         val: "3-month subscription" },
            { label: "Next renewal", val: paused ? "Paused" : nextDate },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#aaa] mb-1">{item.label}</div>
              <div className="text-[14px] font-semibold text-[#1A1A1A]">{item.val}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-[#F0EDE8]">
          <button onClick={() => { setPaused((v) => !v); save(paused ? "Ready Series Subscription resumed" : "Next delivery skipped"); }}
            className="border border-[#D0CCC4] px-5 py-2.5 text-[12px] font-medium text-[#666] hover:border-[#111] hover:text-[#111] transition-colors">
            {paused ? "▶ Resume Subscription" : "⏸ Skip Next Delivery"}
          </button>
          <button onClick={() => navigate("ready-series")}
            className="border border-[#D0CCC4] px-5 py-2.5 text-[12px] font-medium text-[#666] hover:border-[#111] hover:text-[#111] transition-colors">
            View Subscription Options →
          </button>
          <button onClick={() => { setActive(false); save("Ready Series Subscription cancelled"); }}
            className="ml-auto text-[12px] text-[#c00] hover:underline transition-colors">
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  navigate: (page: Page) => void;
  initialTab?: Tab;
  initialSection?: string;
}

type Tab = "dashboard" | "subscription" | "orders" | "wallet" | "rewards" | "gift-card" | "settings";

const ORDERS = [
  { id: "PM-20250901-7721", date: "1 Sep 2025", items: "Herb Chicken ×2, Teriyaki ×1", total: 36.70, originalTotal: 40.78, status: "Delivered", type: "ready", promo: "WELCOME10", promoSaving: 4.08 },
  { id: "PM-20250825-7698", date: "25 Aug 2025", items: "Meal Plan — Maintain (Week 12)", total: 178.00, originalTotal: 178.00, status: "Delivered", type: "plan", promo: null, promoSaving: 0 },
  { id: "PM-20250818-7641", date: "18 Aug 2025", items: "Build-A-Box ×10", total: 101.15, originalTotal: 119.00, status: "Delivered", type: "box", promo: "WELCOME15", promoSaving: 17.85 },
  { id: "PM-20250811-7588", date: "11 Aug 2025", items: "Meal Plan — Maintain (Week 11)", total: 178.00, originalTotal: 178.00, status: "Delivered", type: "plan", promo: null, promoSaving: 0 },
  { id: "PM-20250804-7522", date: "4 Aug 2025", items: "Low Carb Bundle, Salmon ×2", total: 83.60, originalTotal: 83.60, status: "Delivered", type: "ready", promo: null, promoSaving: 0 },
];

const PROMO_HISTORY = ORDERS.filter((o) => o.promo);

const WALLET_HISTORY = [
  { date: "1 Sep 2025", desc: "Purchase — #PM-20250901-7721", pts: +36, type: "earn" },
  { date: "25 Aug 2025", desc: "Meal Plan bonus (2× pts)", pts: +356, type: "earn" },
  { date: "20 Aug 2025", desc: "Redeemed 500 pts", pts: -500, type: "redeem" },
  { date: "18 Aug 2025", desc: "Build-A-Box — #PM-20250818-7641", pts: +119, type: "earn" },
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DELIVERED_DAYS = ["Mon"];
const TIME_SLOTS = ["6:00am – 9:00am", "9:00am – 12:00pm", "12:00pm – 3:00pm", "3:00pm – 6:00pm"];

// Current week's meal schedule — each delivery day has N meal slots
const INITIAL_SCHEDULE: Record<string, number[]> = {
  Mon: [1, 4],
  Wed: [9, 7],
  Fri: [5, 2],
  Sat: [3],
};

export default function AccountPage({ navigate, initialTab, initialSection }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "dashboard");

  useEffect(() => {
    if (initialSection === "referral") {
      setTimeout(() => {
        document.getElementById("referral-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [initialSection]);

  const [subPaused, setSubPaused] = useState(false);
  const [pauseWeeks, setPauseWeeks] = useState(1);
  const [showPauseModal, setShowPauseModal] = useState(false);

  const [activePlan, setActivePlan] = useState("MAINTAIN");
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [deliveryDays, setDeliveryDays] = useState<string[]>(["Mon", "Wed", "Fri", "Sat"]);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [billing, setBilling] = useState<"biweekly" | "month">("biweekly");

  // Meal swap state
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);
  const [swapTarget, setSwapTarget] = useState<{ day: string; slotIdx: number } | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  // Edit mode flags per section
  const [editingDays, setEditingDays] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [editingQty, setEditingQty] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [showCheaperPlanHint, setShowCheaperPlanHint] = useState(false);

  // Cancel subscription flow
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState<1 | 2>(1);
  const [subCancelled, setSubCancelled] = useState(false);

  // Points redemption
  const [redeemPts, setRedeemPts] = useState(500);

  // Wallet top-up
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(50);
  const [topUpCard, setTopUpCard] = useState("");
  const [topUpExpiry, setTopUpExpiry] = useState("");
  const [topUpCvc, setTopUpCvc] = useState("");
  const [topUpName, setTopUpName] = useState("");
  const [topUpDone, setTopUpDone] = useState(false);
  const [topUpError, setTopUpError] = useState(false);
  const PRESET_AMOUNTS = [20, 50, 100, 200];
  const handleTopUp = () => {
    if (!topUpCard || !topUpExpiry || !topUpCvc || !topUpName) { setTopUpError(true); return; }
    setTopUpDone(true);
  };

  // Card management
  const [showAddCard, setShowAddCard] = useState(false);

  // Review flow
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [menuMode, setMenuMode] = useState<"browse" | "review">("review");
  const [activeWeek, setActiveWeek] = useState(0);

  // My Plan context toggle: Meal Plan vs Ready Series subscription
  const [myPlanContext, setMyPlanContext] = useState<"mealplan" | "readyseries">("mealplan");

  const plan = PLANS.find((p) => p.name === activePlan) || PLANS[1];

  const toggleDay = (day: string) => {
    setDeliveryDays((prev) =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
    );
  };

  const swapMeal = (mealId: number) => {
    if (!swapTarget) return;
    setSchedule((prev) => {
      const daySlots = [...(prev[swapTarget.day] || [])];
      daySlots[swapTarget.slotIdx] = mealId;
      return { ...prev, [swapTarget.day]: daySlots };
    });
    setSwapTarget(null);
  };

  const save = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const openCheaperPlanOptions = () => {
    const hasCheaperPlan = PLANS.some((candidate) => candidate.priceWeek < plan.priceWeek);
    setShowCancelModal(false);

    if (!hasCheaperPlan) {
      save("You're already on the lowest-cost plan");
      return;
    }

    setTab("subscription");
    setMyPlanContext("mealplan");
    setShowCheaperPlanHint(true);
    setEditingPlan(true);
    setTimeout(() => {
      document.getElementById("plan-type-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "subscription", label: "My Plan" },
    { key: "orders", label: "Order History" },
    { key: "wallet", label: "Wallet" },
    { key: "rewards", label: "Rewards" },
    { key: "gift-card", label: "Gift Cards" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Account header */}
      <div className="bg-[#111111] text-white py-8 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#F5B300] rounded-full flex items-center justify-center text-[#111111] font-display text-[22px] font-bold shrink-0">J</div>
            <div>
              <h1 className="font-display text-[24px] font-bold">Jerome Tan</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[#F5B300] text-[11px] font-mono tracking-wider">VIP Member</span>
                <span className="text-white/30">·</span>
                <span className="text-white/40 text-[12px]">Member since Jun 2024</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-center">
            {[
              { val: "1,234", label: "Points" },
              { val: "$12.50", label: "Wallet" },
              { val: "Week 13", label: "Plan Week" },
              { val: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); })(), label: "Next Billing" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-[18px] sm:text-[22px] font-bold text-[#F5B300]">{s.val}</div>
                <div className="text-white/35 text-[11px] uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E5E2DA] sticky top-[60px] z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-[12px] sm:text-[13px] tracking-wider uppercase font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${tab === t.key ? "border-[#111111] text-[#111111]" : "border-transparent text-[#999] hover:text-[#111]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save toast */}
      {savedMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-[#F5B300] text-[#1A1A1A] px-6 py-3 text-[13px] font-bold tracking-wider border border-[#E8E4DC]">
          ✓ {savedMsg}
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && (
          <div>
            <h2 className="font-display text-[28px] font-bold mb-6">Welcome back, Jerome.</h2>

            {/* ── Renewal reminder banner ── */}
            <div className="mb-6 bg-amber-50 border border-amber-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-[22px] mt-0.5">🔔</span>
                <div>
                  <div className="font-semibold text-[14px] text-amber-900">Your plan renews in 3 days — Sunday, 7 Sep 2025</div>
                  <div className="text-amber-700 text-[12px] mt-0.5 leading-relaxed">
                    Lock in your menu selections by <strong>Thursday 1pm</strong> to avoid auto-filling. After renewal, your next 5-day cycle begins Mon 8 Sep.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 ml-9 sm:ml-0">
                <button onClick={() => setTab("subscription")}
                  className="bg-amber-400 text-[#111] text-[11px] font-bold tracking-[0.15em] uppercase px-4 py-2 hover:bg-amber-300 transition-colors whitespace-nowrap">
                  Review Menu
                </button>
                <button className="border border-amber-300 text-amber-700 text-[11px] font-bold tracking-[0.15em] uppercase px-4 py-2 hover:bg-amber-100 transition-colors whitespace-nowrap">
                  Dismiss
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {[
                { label: "Active Plan", val: activePlan, sub: `${plan.cal} kcal/day`, onClick: () => setTab("subscription") },
                { label: "Wallet Balance", val: "$12.50", sub: "1,234 reward pts", onClick: () => setTab("wallet") },
              ].map((s) => (
                <div key={s.label} className="p-5 bg-[#1A1A1A] cursor-pointer hover:opacity-90 transition-opacity" onClick={s.onClick}>
                  <div className="text-[10px] font-mono tracking-[0.3em] uppercase mb-3 text-[#F5B30080]">{s.label}</div>
                  <div className="font-display text-[26px] font-bold text-[#F5B300]">{s.val}</div>
                  <div className="text-white/30 text-[12px] mt-1">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Active sub card */}
            <div className={`border mb-6 ${subPaused ? "border-amber-300 bg-amber-50" : "border-white/10 bg-[#1A1A1A]"}`}>
              <div className="p-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className={`font-mono text-[10px] tracking-[0.3em] uppercase mb-2 ${subPaused ? "text-amber-600" : "text-[#F5B300]"}`}>
                    {subPaused ? "⏸ Subscription Paused" : "● Active Subscription"}
                  </div>
                  <h3 className={`font-display text-[24px] font-bold ${subPaused ? "text-[#333]" : "text-white"}`}>
                    {activePlan} Plan
                  </h3>
                  <div className={`text-[13px] mt-1 ${subPaused ? "text-amber-700" : "text-white/40"}`}>
                    {subPaused
                      ? `Paused · Resumes ${(() => { const d = new Date(); d.setDate(d.getDate() + pauseWeeks * 7); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); })()}`
                      : `${billing === "biweekly" ? "Biweekly" : "Monthly"} billing`}
                  </div>
                </div>
                <div className="flex gap-3">
                  {subPaused ? (
                    <button onClick={() => setSubPaused(false)} className="bg-[#F5B300] text-[#111] px-5 py-2.5 text-[12px] font-bold tracking-widest uppercase hover:bg-[#111] hover:text-[#F5B300] transition-colors">
                      Resume Plan
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setShowPauseModal(true)} className="border border-white/20 text-white/60 px-5 py-2.5 text-[12px] font-bold tracking-widest uppercase hover:border-[#F5B300] hover:text-[#F5B300] transition-colors">
                        Pause
                      </button>
                      <button onClick={() => setTab("subscription")} className="bg-[#F5B300] text-[#111] px-5 py-2.5 text-[12px] font-bold tracking-widest uppercase hover:bg-white transition-colors">
                        Manage Plan →
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Customize shortcuts */}
              {!subPaused && (
                <div className="border-t border-white/10 px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: "🔄", label: "Swap meals", desc: "Change upcoming meals" },
                    { icon: "⚖️", label: "Plan type", desc: `${activePlan} · ${plan.cal} kcal` },
                  ].map((item) => (
                    <button key={item.label} onClick={() => setTab("subscription")}
                      className="text-left p-3 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="text-[16px] mb-1">{item.icon}</div>
                      <div className="text-white text-[12px] font-medium">{item.label}</div>
                      <div className="text-white/35 text-[11px] mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          {/* Box subscription dashboard card */}
          <div className="border border-[#E5E2DA] bg-white mb-2">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[18px]">📦</span>
                <div>
                  <div className="text-[12px] font-semibold text-[#1A1A1A]">Ready Series Subscription · Low Carb Meals · 3-Month Term</div>
                  <div className="text-[11px] text-[#888] mt-0.5">Next delivery scheduled</div>
                </div>
              </div>
              <button onClick={() => setTab("subscription")} className="text-[11px] font-mono text-[#888] hover:text-[#1A1A1A] transition-colors whitespace-nowrap">
                Manage →
              </button>
            </div>
          </div>

          </div>
        )}

        {/* ══ MY PLAN / SUBSCRIPTION ══ */}
        {tab === "subscription" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display text-[28px] font-bold">My Plan</h2>
                {/* Context toggle */}
                <div className="flex border border-[#E5E2DA] overflow-hidden mt-3 w-fit">
                  {([
                    { key: "mealplan"    as const, label: "Meal Plan"    },
                    { key: "readyseries" as const, label: "Ready Series" },
                  ]).map(({ key, label }) => (
                    <button key={key} onClick={() => setMyPlanContext(key)}
                      className={`px-5 py-2 text-[11px] font-bold tracking-wide transition-all border-r border-[#E5E2DA] last:border-r-0
                        ${myPlanContext === key ? "bg-[#1A1A1A] text-white" : "text-[#888] hover:text-[#1A1A1A] bg-white"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {myPlanContext === "mealplan" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-3 text-[12px] text-[#666] bg-white border border-[#E5E2DA] px-4 py-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F5B300" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="1"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    <span>Next billing:</span>
                    <strong className="text-[#111]">{(() => { const d = new Date(); billing === "biweekly" ? d.setDate(d.getDate() + 14) : d.setMonth(d.getMonth() + 1); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); })()}</strong>
                  </div>
                  {subPaused ? (
                    <button onClick={() => setSubPaused(false)} className="bg-[#F5B300] text-[#111] px-5 py-2.5 text-[12px] font-bold tracking-widest uppercase hover:bg-[#111] hover:text-[#F5B300] transition-colors">
                      Resume Subscription
                    </button>
                  ) : (
                    <button onClick={() => setShowPauseModal(true)} className="border border-[#D0CCC4] px-5 py-2.5 text-[12px] font-medium text-[#666] hover:border-[#111] hover:text-[#111] transition-colors">
                      ⏸ Pause Plan
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── READY SERIES context ── */}
            {myPlanContext === "readyseries" && (
              <div className="space-y-5">
                <BoxSubscriptionCard navigate={navigate} save={save} />
              </div>
            )}

            {/* ── MEAL PLAN context ── */}
            {myPlanContext === "mealplan" && <>
            {subPaused && (
              <div className="bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
                <span className="text-[20px]">⏸</span>
                <div>
                  <div className="font-medium text-amber-800">Plan paused for {pauseWeeks} week{pauseWeeks > 1 ? "s" : ""}</div>
                  <div className="text-amber-600 text-[13px]">No deliveries or charges until {(() => { const d = new Date(); d.setDate(d.getDate() + pauseWeeks * 7); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); })()}.</div>
                </div>
              </div>
            )}

            {/* ── 1. PLAN TYPE ── */}
            <div id="plan-type-section" className="bg-white border border-[#E5E2DA]">
              <div className="p-5 border-b border-[#E5E2DA]">
                <h3 className="font-medium text-[15px]">Plan Type</h3>
                <p className="text-[#888] text-[12px] mt-0.5">Your current meal programme and billing cycle</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 flex-wrap mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-1 border" style={{ color: plan.accent, borderColor: plan.accent + "44" }}>{activePlan}</span>
                    <div className="text-[18px] font-bold text-[#1A1A1A]">{plan.desc}</div>
                  </div>
                  <div className="ml-auto">
                    <div className="text-[11px] text-[#888]">Billing: <strong className="text-[#1A1A1A]">{billing === "biweekly" ? "Biweekly" : "Monthly"}</strong></div>
                  </div>
                  {!editingPlan ? (
                    <button onClick={() => { setShowCheaperPlanHint(false); setEditingPlan(true); }} className="border border-[#D0CCC4] px-4 py-2 text-[11px] font-medium text-[#666] hover:border-[#111] hover:text-[#111] transition-colors">
                      Change Plan
                    </button>
                  ) : (
                    <button onClick={() => { setEditingPlan(false); setShowCheaperPlanHint(false); save(`Plan changed to ${activePlan}`); }} className="bg-[#111] text-white px-4 py-2 text-[11px] font-medium hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                      Save
                    </button>
                  )}
                </div>
                {editingPlan && (
                  <div className="border-t border-[#F0EDE8] pt-4">
                    {showCheaperPlanHint && (
                      <div className="bg-[#FFF9E8] border border-[#F5B300]/40 px-4 py-3 mb-4">
                        <div className="text-[12px] font-semibold text-[#1A1A1A]">Lower-cost plans</div>
                        <div className="text-[11px] text-[#777] mt-0.5">Select an option below, then choose Save. Your next billing cycle will use the new price.</div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PLANS.filter((candidate) => !showCheaperPlanHint || candidate.priceWeek < plan.priceWeek).map((p) => (
                      <button key={p.name} onClick={() => setActivePlan(p.name)}
                        className={`p-3 border text-left transition-all ${activePlan === p.name ? "border-[#111] bg-[#F7F5F0]" : "border-[#E5E2DA] text-[#888] hover:border-[#999]"}`}>
                        <div className="font-mono text-[10px] tracking-[0.25em] mb-1" style={{ color: p.accent }}>{p.name}</div>
                        <div className="text-[12px] leading-relaxed">{p.desc}</div>
                        <div className="text-[12px] font-bold text-[#1A1A1A] mt-2">${p.priceWeek} / 2 weeks</div>
                      </button>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. MENU REVIEW ── */}
            {(() => {
              // Plan progress — weeks depend on plan type
              const PLAN_TOTAL_WEEKS: Record<string, number> = { CUT: 12, MAINTAIN: 12, BUILD: 12, "6BY60": 9, "BUDDY": 3, "HYROX": 8 };
              const totalWeeks = PLAN_TOTAL_WEEKS[activePlan] ?? 12;
              const currentPlanWeek = 13; // Week 13 of subscription (from order history)
              const weeksRemaining = Math.max(0, totalWeeks - (currentPlanWeek - 1));

              // Generate upcoming schedule weeks dynamically
              const baseDate = new Date();
              baseDate.setDate(baseDate.getDate() - baseDate.getDay() + 1); // start of this Mon
              // Cutoff = Thursday 1pm each week. Simulate: week 0 is past cutoff, week 1 approaching, weeks 2-3 open
              const WEEKS = Array.from({ length: 4 }, (_, i) => {
                const start = new Date(baseDate); start.setDate(start.getDate() + i * 7);
                const end = new Date(start); end.setDate(end.getDate() + 4);
                const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                const cutoffState = i === 0 ? "closed" : i === 1 ? "approaching" : i === 2 ? "open" : "upcoming";
                return {
                  label: i === 0 ? "This Week" : `Week ${i + 1}`,
                  dates: `${fmt(start)} – ${fmt(end)}`,
                  weekNum: currentPlanWeek + i,
                  editable: i < 2,
                  cutoffState,
                };
              });

              const MEAL_SLOTS: Record<number, { mealId: number; slot: "Lunch" | "Dinner" }[]> = {
                0: [{ mealId: 1, slot: "Lunch" }, { mealId: 4, slot: "Dinner" }],
                1: [{ mealId: 9, slot: "Lunch" }, { mealId: 7, slot: "Dinner" }],
                2: [{ mealId: 5, slot: "Lunch" }],
                3: [{ mealId: 3, slot: "Lunch" }, { mealId: 2, slot: "Dinner" }],
              };
              const currentWeek = WEEKS[activeWeek];
              const slots = MEAL_SLOTS[activeWeek] || MEAL_SLOTS[0];
              const isPastCutoff = activeWeek === 0;

              return (
                <div className="bg-white border border-[#E5E2DA]">
                  {/* Plan progress bar */}
                  <div className="px-5 pt-5 pb-4 border-b border-[#E5E2DA]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-[15px]">Menu Review</h3>
                        <p className="text-[#888] text-[12px] mt-0.5">Swap cutoff: <strong className="text-[#1A1A1A]">Thursday 1pm</strong> each week</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[11px] text-[#888]">Plan week <strong className="text-[#1A1A1A]">{currentPlanWeek}</strong> of {totalWeeks}</div>
                        <div className={`font-mono text-[11px] mt-0.5 ${weeksRemaining <= 2 ? "text-[#E85D04] font-bold" : "text-[#888]"}`}>
                          {weeksRemaining} week{weeksRemaining !== 1 ? "s" : ""} remaining
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-[#F0EDE8] w-full">
                      <div className="h-full bg-[#F5B300] transition-all"
                        style={{ width: `${Math.min(((currentPlanWeek - 1) / totalWeeks) * 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] font-mono text-[#ccc]">Week 1</span>
                      <span className="text-[9px] font-mono text-[#ccc]">Week {totalWeeks}</span>
                    </div>
                  </div>

                  {/* Browse / Review toggle + week selector row */}
                  <div className="flex items-center justify-between border-b border-[#E5E2DA] pr-4">
                    <div className="flex overflow-x-auto">
                      {WEEKS.map((w, i) => {
                        const stateConfig: Record<string, { label: string; cls: string }> = {
                          closed:     { label: "Changes closed",    cls: "bg-[#FFF5F5] text-[#c00] border border-[#fcc]" },
                          approaching:{ label: "Cutoff approaching", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
                          open:       { label: "Open for changes",  cls: "bg-[#F0FAF4] text-green-700 border border-green-200" },
                          upcoming:   { label: "Upcoming",          cls: "bg-[#F7F5F0] text-[#999] border border-[#E5E2DA]" },
                        };
                        const state = stateConfig[w.cutoffState];
                        return (
                          <button key={i} onClick={() => setActiveWeek(i)}
                            className={`px-5 py-3 shrink-0 text-left border-b-2 transition-colors ${activeWeek === i ? "border-[#F5B300] text-[#1A1A1A]" : "border-transparent text-[#999] hover:text-[#1A1A1A]"}`}>
                            <div className={`text-[12px] font-semibold ${activeWeek === i ? "text-[#1A1A1A]" : ""}`}>
                              {w.label} <span className="font-mono text-[9px] ml-1 opacity-50">W{w.weekNum}</span>
                            </div>
                            <div className="text-[10px] text-[#aaa] mt-0.5 mb-1.5">{w.dates}</div>
                            <span className={`inline-block text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 ${state.cls}`}>
                              {state.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex border border-[#E5E2DA] overflow-hidden shrink-0 ml-3">
                      {(["review", "browse"] as const).map((m) => (
                        <button key={m} onClick={() => setMenuMode(m)}
                          className={`px-3 py-2 text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${menuMode === m ? "bg-[#1A1A1A] text-white" : "text-[#888] hover:text-[#1A1A1A]"}`}>
                          {m === "browse" ? "Browse" : "My Menu"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cutoff / pause warning */}
                  {currentWeek.cutoffState === "closed" && !subPaused && (
                    <div className="mx-5 mt-4 bg-[#FFF5F5] border border-[#fcc] px-4 py-2.5 flex items-center gap-2 text-[12px] text-[#c00]">
                      <span>🔒</span>
                      <span><strong>Changes closed</strong> — the cutoff for this week has passed. Meals are locked for delivery.</span>
                    </div>
                  )}
                  {currentWeek.cutoffState === "approaching" && !subPaused && (
                    <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2 text-[12px] text-amber-700">
                      <span>⚠️</span>
                      <span><strong>Cutoff approaching</strong> — swap closes <strong>Thursday 1pm</strong>. Make your changes now.</span>
                    </div>
                  )}
                  {currentWeek.cutoffState === "open" && !subPaused && (
                    <div className="mx-5 mt-4 bg-[#F0FAF4] border border-green-200 px-4 py-2.5 flex items-center gap-2 text-[12px] text-green-700">
                      <span>✓</span>
                      <span><strong>Open for changes</strong> — you can swap meals until <strong>Thursday 1pm</strong> this week.</span>
                    </div>
                  )}
                  {currentWeek.cutoffState === "upcoming" && !subPaused && (
                    <div className="mx-5 mt-4 bg-[#F7F5F0] border border-[#E5E2DA] px-4 py-2.5 flex items-center gap-2 text-[12px] text-[#888]">
                      <span>📅</span>
                      <span><strong>Upcoming week</strong> — menu will be available for selection from Monday.</span>
                    </div>
                  )}
                  {subPaused && (
                    <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2 text-[12px] text-amber-700">
                      <span>⏸</span>
                      <span>Plan is paused — no deliveries scheduled. Menu selections are preserved.</span>
                    </div>
                  )}

                  {menuMode === "review" ? (
                    <div className="divide-y divide-[#F0EDE8]">
                      {slots.map(({ mealId, slot }, slotIdx) => {
                        const meal = MEALS.find((m) => m.id === mealId) || MEALS[0];
                        const isDelivered = activeWeek === 0 && DELIVERED_DAYS.includes("Mon") && slotIdx === 0;
                        return (
                          <div key={slotIdx} className={`flex items-center gap-4 px-5 py-4 ${isDelivered ? "opacity-50" : ""}`}>
                            <img src={meal.img} alt={meal.name} className="w-14 h-14 object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-[14px] truncate block">{meal.name}</span>
                              <div className="text-[11px] text-[#888] mt-0.5">{meal.cal} kcal · {meal.protein}g protein</div>
                            </div>
                            <div className={`shrink-0 px-2.5 py-1 text-[10px] font-bold tracking-wider border ${slot === "Lunch" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-100 bg-blue-50 text-blue-700"}`}>
                              {slot}
                            </div>
                            {!isDelivered && currentWeek.editable && (
                              <button onClick={() => setSwapTarget({ day: `week${activeWeek}-slot${slotIdx}`, slotIdx })}
                                className="shrink-0 border border-[#D0CCC4] px-4 py-1.5 text-[11px] font-bold text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] hover:bg-[#F7F5F0] transition-colors">
                                Swap
                              </button>
                            )}
                            {isDelivered && <span className="shrink-0 text-[11px] text-[#aaa] font-medium">Delivered ✓</span>}
                            {!currentWeek.editable && !isDelivered && (
                              <span className="shrink-0 text-[10px] font-mono text-[#ccc] border border-[#eee] px-2 py-1">Locked</span>
                            )}
                          </div>
                        );
                      })}
                      <div className="px-5 py-3 bg-[#FAFAF8] flex items-center justify-between">
                        <span className="text-[11px] text-[#888]">{slots.length} meal{slots.length !== 1 ? "s" : ""} · {currentWeek.dates}</span>
                        {currentWeek.editable && <span className="text-[10px] font-mono text-[#ccc]">Swap closes Thursday 1pm</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      <p className="text-[#888] text-[13px] mb-4">Browse available meals for {currentWeek.label} ({currentWeek.dates}). Tap <strong>Swap</strong> on a scheduled meal to switch.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {MEALS.slice(0, 6).map((meal) => (
                          <div key={meal.id} className="border border-[#E5E2DA] flex gap-3 p-3 items-center hover:border-[#1A1A1A] transition-colors">
                            <img src={meal.img} alt={meal.name} className="w-12 h-12 object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-medium leading-snug truncate">{meal.name}</div>
                              <div className="text-[10px] text-[#888] mt-0.5">{meal.cal} kcal · {meal.protein}g pro</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── 6. BILLING CYCLE ── */}
            {(() => {
              const nextBillingDate = (() => {
                const d = new Date();
                billing === "biweekly" ? d.setDate(d.getDate() + 14) : d.setMonth(d.getMonth() + 1);
                return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              })();
              return (
                <div className="bg-white border border-[#E5E2DA] p-5">
                  <h3 className="font-medium text-[15px] mb-1">Billing Cycle</h3>
                  <p className="text-[#888] text-[13px] mb-4">
                    Next charge: <strong className="text-[#111]">{nextBillingDate}</strong>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <button onClick={() => setBilling("biweekly")}
                      className={`flex-1 px-6 py-4 border text-left transition-all ${billing === "biweekly" ? "bg-[#111] text-white border-[#111]" : "border-[#D0CCC4] text-[#666] hover:border-[#888]"}`}>
                      <div className={`text-[13px] font-semibold ${billing === "biweekly" ? "text-white" : "text-[#111]"}`}>Biweekly</div>
                      <div className={`text-[22px] font-display font-bold mt-0.5 ${billing === "biweekly" ? "text-[#F5B300]" : "text-[#111]"}`}>${plan.priceWeek}</div>
                      <div className={`text-[11px] mt-0.5 ${billing === "biweekly" ? "text-white/50" : "text-[#888]"}`}>billed every 2 weeks</div>
                    </button>
                    <button onClick={() => setBilling("month")}
                      className={`flex-1 px-6 py-4 border text-left transition-all ${billing === "month" ? "bg-[#111] text-white border-[#111]" : "border-[#D0CCC4] text-[#666] hover:border-[#888]"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`text-[13px] font-semibold ${billing === "month" ? "text-white" : "text-[#111]"}`}>Monthly</div>
                        <span className="text-[9px] font-bold tracking-[0.15em] uppercase bg-[#F5B300] text-[#111] px-1.5 py-0.5">Save 12%</span>
                      </div>
                      <div className={`text-[22px] font-display font-bold mt-0.5 ${billing === "month" ? "text-[#F5B300]" : "text-[#111]"}`}>${plan.priceMonth}</div>
                      <div className={`text-[11px] mt-0.5 ${billing === "month" ? "text-white/50" : "text-[#888]"}`}>
                        per month · save ${(plan.priceWeek * 4 - plan.priceMonth).toFixed(0)} vs. biweekly
                      </div>
                    </button>
                  </div>
                  <button onClick={() => save("Billing cycle updated")} className="bg-[#111] text-white px-6 py-3 text-[12px] font-bold tracking-widest uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                    Save Billing Preference
                  </button>
                </div>
              );
            })()}

            {/* ── 7. PAUSE / CANCEL ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[#E5E2DA] p-5">
                <h3 className="font-medium text-[15px] mb-1">{subPaused ? "Resume Plan" : "Pause Plan"}</h3>
                <p className="text-[#888] text-[13px] mb-4">No charges while paused. Plan and meal settings are preserved.</p>
                {!subPaused && (
                  <div className="flex flex-col gap-2 mb-4">
                    {[1, 2, 3, 4].map((w) => {
                      const start = new Date(); start.setDate(start.getDate() + 1);
                      const end = new Date(start); end.setDate(end.getDate() + w * 7 - 1);
                      const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                      return (
                        <button key={w} onClick={() => setPauseWeeks(w)}
                          className={`flex items-center justify-between px-4 py-2.5 border text-left transition-all ${pauseWeeks === w ? "bg-[#111] text-white border-[#111]" : "border-[#D0CCC4] hover:border-[#888]"}`}>
                          <span className={`text-[13px] font-bold ${pauseWeeks === w ? "text-white" : "text-[#111]"}`}>{w} week{w > 1 ? "s" : ""}</span>
                          <span className={`text-[11px] font-mono ${pauseWeeks === w ? "text-white/50" : "text-[#888]"}`}>{fmt(start)} – {fmt(end)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={() => { setSubPaused((v) => !v); save(subPaused ? "Plan resumed" : `Plan paused for ${pauseWeeks} week${pauseWeeks > 1 ? "s" : ""}`); }}
                  className={`w-full py-3 text-[12px] font-bold tracking-widest uppercase transition-colors ${subPaused ? "bg-[#1A1A1A] text-white hover:bg-[#111]" : "border border-[#111] text-[#111] hover:bg-[#111] hover:text-white"}`}
                >
                  {subPaused ? "Resume My Plan" : `Pause ${pauseWeeks} Week${pauseWeeks > 1 ? "s" : ""}`}
                </button>
              </div>
              <div className="bg-white border border-[#E5E2DA] p-5">
                {subCancelled ? (
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#c00] mb-2">Subscription Cancelled</div>
                    <p className="text-[#444] text-[13px]">Your plan ended. Your history and meal preferences are saved if you ever return.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-medium text-[15px] mb-1 text-[#c00]">Cancel Subscription</h3>
                    <p className="text-[#888] text-[13px] mb-4">We'll be sad to see you go. If cost is a concern, consider pausing instead — your plan and history are preserved.</p>
                    <button onClick={() => { setShowCancelModal(true); setCancelStep(1); }} className="w-full py-3 text-[12px] font-bold tracking-widest uppercase border border-[#c00] text-[#c00] hover:bg-[#c00] hover:text-white transition-colors">
                      Cancel Plan
                    </button>
                  </>
                )}
              </div>
            </div>
            </>}
          </div>
        )}

        {/* ══ ORDERS ══ */}
        {tab === "orders" && (
          <div>
            <h2 className="font-display text-[28px] font-bold mb-6">Order History</h2>

            {/* Promo Code Savings Summary */}
            {PROMO_HISTORY.length > 0 && (
              <div className="bg-[#111] text-white p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.3em] text-[#F5B300] uppercase mb-1">Promo Codes Used</div>
                    <div className="font-display text-[22px] font-bold">
                      Total saved: <span className="text-[#F5B300]">${PROMO_HISTORY.reduce((s, o) => s + o.promoSaving, 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/40 text-[12px]">{PROMO_HISTORY.length} code{PROMO_HISTORY.length > 1 ? "s" : ""} redeemed</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {PROMO_HISTORY.map((o) => (
                    <div key={o.id} className="flex items-center justify-between bg-white/5 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="bg-[#F5B300] text-[#111] text-[10px] font-extrabold tracking-widest px-2 py-0.5">{o.promo}</span>
                        <div>
                          <div className="text-[13px] font-medium">{o.items}</div>
                          <div className="text-white/40 text-[11px]">{o.id} · {o.date}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-[#F5B300] font-bold text-[14px]">–${o.promoSaving.toFixed(2)}</div>
                        <div className="text-white/40 text-[11px]">was ${o.originalTotal.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {ORDERS.map((o) => (
                <div key={o.id} className="bg-white border border-[#E5E2DA] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center text-[18px] shrink-0 ${o.type === "plan" ? "bg-[#1A1A1A]" : "bg-[#111111]"}`}>
                      {o.type === "plan" ? "🥗" : o.type === "box" ? "📦" : "❄️"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[14px]">{o.items}</span>
                        {o.promo && (
                          <span className="bg-[#F5B300] text-[#111] text-[9px] font-extrabold tracking-widest px-1.5 py-0.5">{o.promo}</span>
                        )}
                      </div>
                      <div className="text-[#999] text-[12px] mt-0.5">{o.id} · {o.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 sm:shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-[15px]">${o.total.toFixed(2)}</div>
                      {o.promo && <div className="text-green-600 text-[11px] font-medium">saved ${o.promoSaving.toFixed(2)}</div>}
                      {!o.promo && <div className="text-[12px] text-green-600 font-medium">{o.status}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button className="border border-[#D0CCC4] px-4 py-2 text-[12px] hover:border-[#111] transition-colors whitespace-nowrap">Reorder</button>
                      {o.status === "Delivered" && (
                        <button onClick={() => { setReviewOrderId(o.id); setReviewStars(5); setReviewText(""); }} className="border border-[#F5B300] text-[#a07800] px-4 py-2 text-[12px] hover:bg-[#F5B300] hover:text-[#111] transition-colors whitespace-nowrap">Review</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ WALLET ══ */}
        {tab === "wallet" && (
          <div>
            <h2 className="font-display text-[28px] font-bold mb-8">Wallet & Rewards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Wallet Balance", val: "$12.50", sub: "Available to spend", color: "#F5B300", bg: "#1A1A1A" },
                { label: "Reward Points", val: "1,234", sub: "= $12.34 value", color: "#F5B300", bg: "#1A1A1A" },
                { label: "Lifetime Earned", val: "4,891 pts", sub: "Since Jun 2024", color: "#F5B300", bg: "#1A1A1A" },
              ].map((s) => (
                <div key={s.label} className="p-6" style={{ backgroundColor: s.bg }}>
                  <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3 text-white/30">{s.label}</div>
                  <div className="font-display text-[30px] font-bold" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-white/30 text-[12px] mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
            {/* ── TOP UP WALLET ── */}
            <div className="bg-white border border-[#E5E2DA] p-6 mb-5">
              <div className="flex items-center justify-between gap-4 mb-1">
                <div>
                  <h3 className="font-medium text-[16px]">Top Up Wallet</h3>
                  <p className="text-[#888] text-[13px] mt-0.5">Add credit via card — use it on any order at checkout.</p>
                </div>
                <button onClick={() => { setShowTopUp(true); setTopUpDone(false); setTopUpError(false); setTopUpCard(""); setTopUpExpiry(""); setTopUpCvc(""); setTopUpName(""); }}
                  className="shrink-0 bg-[#111] text-white text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 hover:bg-[#F5B300] hover:text-[#111] transition-colors whitespace-nowrap">
                  + Add Credit
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {PRESET_AMOUNTS.map((a) => (
                  <div key={a} className="border border-[#E5E2DA] px-4 py-2 text-[13px] text-[#666]">
                    <span className="font-bold text-[#111]">${a}</span>
                    {a === 50 && <span className="ml-2 bg-[#F5B300] text-[#111] text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider">Popular</span>}
                  </div>
                ))}
                <div className="border border-[#E5E2DA] px-4 py-2 text-[13px] text-[#666]">Custom amount</div>
              </div>
            </div>

            <div className="bg-white border border-[#E5E2DA] p-6 mb-5">
              <h3 className="font-medium text-[16px] mb-1">Redeem Your Points</h3>
              <p className="text-[#888] text-[13px] mb-5">You have <strong className="text-[#111]">1,234 points</strong>. Choose a voucher to apply to your next order.</p>
              <div className="space-y-2">
                {[
                  { pts: 500,  credit: 5.00,  label: "$5 wallet credit",  bonus: null },
                  { pts: 1000, credit: 11.00, label: "$11 wallet credit", bonus: "10% bonus" },
                  { pts: 2000, credit: 25.00, label: "$25 wallet credit", bonus: "25% bonus" },
                ].map((tier) => {
                  const canRedeem = 1234 >= tier.pts;
                  const selected = redeemPts === tier.pts;
                  return (
                    <div key={tier.pts}
                      onClick={() => canRedeem && setRedeemPts(tier.pts)}
                      className={`flex items-center justify-between gap-4 px-5 py-4 border transition-all ${selected ? "border-[#111] bg-[#111] text-white" : canRedeem ? "border-[#D0CCC4] hover:border-[#111] cursor-pointer" : "border-[#E5E2DA] opacity-40 cursor-not-allowed"}`}>
                      <div className="flex items-center gap-4">
                        <div className={`font-display text-[22px] font-bold ${selected ? "text-[#F5B300]" : "text-[#111]"}`}>{tier.pts}<span className={`text-[12px] font-normal ml-1 ${selected ? "text-white/50" : "text-[#888]"}`}>pts</span></div>
                        <div>
                          <div className={`text-[14px] font-semibold ${selected ? "text-white" : "text-[#111]"}`}>{tier.label}</div>
                          {tier.bonus && <div className={`text-[11px] mt-0.5 ${selected ? "text-[#F5B300]" : "text-[#F5B300]"}`}>{tier.bonus} value</div>}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {selected ? (
                          <button onClick={() => save(`${tier.pts} points redeemed → ${tier.label} added to wallet`)}
                            className="bg-[#F5B300] text-[#111] px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-white transition-colors">
                            Redeem
                          </button>
                        ) : (
                          <div className={`w-5 h-5 border-2 ${canRedeem ? "border-[#D0CCC4]" : "border-[#E5E2DA]"}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[#aaa] text-[11px] mt-3">Rate: 100 pts = $1. Bonus credit applies at higher tiers.</p>
            </div>
            <div className="bg-white border border-[#E5E2DA] p-6">
              <h3 className="font-medium text-[16px] mb-5">Transaction History</h3>
              <div className="space-y-0">
                {WALLET_HISTORY.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-3.5 border-t border-[#F0EDE8] first:border-0">
                    <div>
                      <div className="text-[13px]">{t.desc}</div>
                      <div className="text-[#999] text-[11px] mt-0.5">{t.date}</div>
                    </div>
                    <div className={`font-mono text-[13px] font-bold shrink-0 ${t.type === "earn" ? "text-green-600" : "text-red-500"}`}>
                      {t.pts > 0 ? "+" : ""}{t.pts} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ REWARDS ══ */}
        {tab === "rewards" && (
          <div>
            <h2 className="font-display text-[28px] font-bold mb-2">Rewards</h2>
            <p className="text-[#888] text-[13px] mb-8">Earn points on every order. Redeem for wallet credit anytime.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Points Balance", val: "1,234 pts", sub: "≈ $12.34 credit" },
                { label: "Lifetime Earned", val: "4,820 pts", sub: "Since Oct 2024" },
                { label: "Current Tier", val: "Gold", sub: "Next: Platinum at 5,000 pts" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-[#E5E2DA] p-5">
                  <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#aaa] mb-2">{s.label}</div>
                  <div className="font-display text-[26px] font-extrabold text-[#111]">{s.val}</div>
                  <div className="text-[11px] text-[#aaa] mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E5E2DA] p-6 mb-6">
              <h3 className="font-medium text-[15px] mb-4">Redeem Points</h3>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-mono tracking-widest uppercase text-[#999] mb-2">Points to Redeem</label>
                  <input type="number" defaultValue={500} min={100} step={100}
                    className="w-full border border-[#E5E2DA] px-4 py-3 text-[14px] outline-none focus:border-[#F5B300] transition-colors" />
                  <div className="text-[11px] text-[#aaa] mt-1">500 pts = $5.00 wallet credit · Min. 100 pts</div>
                </div>
                <button className="bg-[#F5B300] text-[#111] px-6 py-3 text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#111] hover:text-white transition-colors whitespace-nowrap">
                  Redeem →
                </button>
              </div>
            </div>
            <div className="bg-white border border-[#E5E2DA] p-6">
              <h3 className="font-medium text-[15px] mb-4">Points History</h3>
              <div className="divide-y divide-[#F0EDE8]">
                {[
                  { date: "1 Sep 2025", desc: "Purchase — #PM-20250901-7721", pts: +36 },
                  { date: "25 Aug 2025", desc: "Meal Plan bonus (2× pts)", pts: +356 },
                  { date: "18 Aug 2025", desc: "Redemption — Wallet top-up", pts: -500 },
                  { date: "11 Aug 2025", desc: "Purchase — #PM-20250811-7588", pts: +178 },
                  { date: "4 Aug 2025", desc: "Referral bonus — Jerome's referral", pts: +200 },
                ].map((r) => (
                  <div key={r.date + r.desc} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-[13px] font-medium text-[#111]">{r.desc}</div>
                      <div className="text-[11px] text-[#aaa]">{r.date}</div>
                    </div>
                    <span className={`font-mono text-[13px] font-bold ${r.pts > 0 ? "text-[#22843a]" : "text-[#e04444]"}`}>
                      {r.pts > 0 ? "+" : ""}{r.pts} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ GIFT CARDS ══ */}
        {tab === "gift-card" && (
          <div>
            <h2 className="font-display text-[28px] font-bold mb-2">Gift Cards</h2>
            <p className="text-[#888] text-[13px] mb-8">Send a gift card to someone you care about, or redeem one you received.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border border-[#E5E2DA] p-6">
                <h3 className="font-medium text-[15px] mb-4">Send a Gift Card</h3>
                <p className="text-[12px] text-[#999] mb-4">Configure and purchase a gift card for a friend or family member.</p>
                <button onClick={() => navigate("gift-card")}
                  className="bg-[#F5B300] text-[#111] px-6 py-3 text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#111] hover:text-white transition-colors">
                  Buy a Gift Card →
                </button>
              </div>
              <div className="bg-white border border-[#E5E2DA] p-6">
                <h3 className="font-medium text-[15px] mb-4">Redeem a Gift Card</h3>
                <label className="block text-[11px] font-mono tracking-widest uppercase text-[#999] mb-2">Gift Card Code</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="PM-XXXX-XXXX-XXXX"
                    className="flex-1 border border-[#E5E2DA] px-4 py-3 text-[13px] outline-none focus:border-[#F5B300] transition-colors font-mono tracking-wider" />
                  <button className="border border-[#111] text-[#111] px-5 py-3 text-[12px] font-bold tracking-[0.12em] uppercase hover:bg-[#111] hover:text-white transition-colors whitespace-nowrap">
                    Redeem
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white border border-[#E5E2DA] p-6">
              <h3 className="font-medium text-[15px] mb-4">Your Gift Cards</h3>
              <div className="text-[13px] text-[#aaa] text-center py-8">No gift cards in your account yet.</div>
            </div>
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab === "settings" && (
          <div>
            <h2 className="font-display text-[28px] font-bold mb-8">Account Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E5E2DA] p-6">
                <h3 className="font-medium text-[16px] mb-5">Personal Details</h3>
                <div className="space-y-4">
                  {[{ l: "First Name", v: "Jerome" }, { l: "Last Name", v: "Tan" }, { l: "Email", v: "jerome@example.com" }, { l: "Phone", v: "+65 9123 4567" }].map((f) => (
                    <div key={f.l}>
                      <label className="block text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">{f.l}</label>
                      <input defaultValue={f.v} className="w-full border border-[#D0CCC4] px-4 py-2.5 text-[14px] outline-none focus:border-[#111] transition-colors" />
                    </div>
                  ))}
                </div>
                <button onClick={() => save("Details saved")} className="mt-5 bg-[#111] text-white px-6 py-3 text-[12px] font-bold tracking-widest uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">Save Changes</button>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-[#E5E2DA] p-6">
                  <h3 className="font-medium text-[16px] mb-4">Saved Addresses</h3>
                  <div className="border border-[#D0CCC4] p-4 mb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[11px] font-mono text-[#888] uppercase tracking-wider mb-1">Default</div>
                        <div className="text-[14px]">123 Toa Payoh Lor 4, #08-22</div>
                        <div className="text-[13px] text-[#888]">Singapore 310123</div>
                      </div>
                      <button className="text-[12px] text-[#888] hover:text-[#111] border border-[#D0CCC4] px-3 py-1 hover:border-[#111] transition-colors">Edit</button>
                    </div>
                  </div>
                  <button className="text-[12px] uppercase tracking-wider text-[#888] hover:text-[#111] transition-colors border border-[#D0CCC4] px-4 py-2 hover:border-[#111] w-full">+ Add Address</button>
                </div>
                <div className="bg-white border border-[#E5E2DA] p-6">
                  <h3 className="font-medium text-[16px] mb-4">Notifications</h3>
                  {[{ l: "Order confirmations", a: true }, { l: "Delivery reminders", a: true }, { l: "Weekly menu updates", a: true }, { l: "Promotions & deals", a: false }].map((n) => (
                    <div key={n.l} className="flex items-center justify-between py-2.5 border-b border-[#F0EDE8] last:border-0">
                      <span className="text-[14px]">{n.l}</span>
                      <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${n.a ? "bg-[#111]" : "bg-[#D0CCC4]"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${n.a ? "left-5" : "left-0.5"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SAVED PAYMENT METHODS ── */}
            <div className="bg-white border border-[#E5E2DA] p-6 mt-6">
              <h3 className="font-medium text-[16px] mb-4">Saved Payment Methods</h3>
              <div className="border border-[#D0CCC4] p-4 mb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 bg-[#1a1f71] flex items-center justify-center shrink-0">
                    <span className="text-white text-[9px] font-bold">VISA</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">Visa ending 4242</div>
                    <div className="text-[12px] text-[#888]">Expires 08/28</div>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest bg-[#F5B300] text-[#111] px-2 py-0.5 uppercase">Default</span>
                </div>
                <button className="border border-[#D0CCC4] px-3 py-1.5 text-[12px] text-[#888] hover:border-[#c00] hover:text-[#c00] transition-colors">Remove</button>
              </div>
              {!showAddCard ? (
                <button onClick={() => setShowAddCard(true)} className="w-full border border-dashed border-[#D0CCC4] py-3 text-[12px] text-[#888] hover:border-[#111] hover:text-[#111] transition-colors">+ Add New Card</button>
              ) : (
                <div className="border border-[#E5E2DA] p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {[{ l: "Card Number", p: "•••• •••• •••• 0000" }, { l: "Name on Card", p: "Jerome Tan" }].map((f) => (
                      <div key={f.l}>
                        <label className="block text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1">{f.l}</label>
                        <input placeholder={f.p} className="w-full border border-[#D0CCC4] px-3 py-2 text-[14px] outline-none focus:border-[#111] transition-colors" />
                      </div>
                    ))}
                    {[{ l: "Expiry", p: "MM/YY" }, { l: "CVC", p: "•••" }].map((f) => (
                      <div key={f.l}>
                        <label className="block text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1">{f.l}</label>
                        <input placeholder={f.p} className="w-full border border-[#D0CCC4] px-3 py-2 text-[14px] outline-none focus:border-[#111] transition-colors" />
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#111]" />
                    <span className="text-[13px] text-[#444]">Save card for one-click checkout</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddCard(false); save("Card saved successfully"); }} className="bg-[#111] text-white px-5 py-2 text-[12px] font-bold tracking-widest uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">Save Card</button>
                    <button onClick={() => setShowAddCard(false)} className="border border-[#D0CCC4] px-5 py-2 text-[12px] text-[#888] hover:border-[#111] transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── SUBSCRIPTION BILLING / AUTO-CHARGE ── */}
            <div className="bg-white border border-[#E5E2DA] p-6 mt-4">
              <h3 className="font-medium text-[16px] mb-2">Subscription Billing</h3>
              <p className="text-[#666] text-[13px] mb-4">Auto-charge authorisation: You have authorised Performance Meals to charge your saved card automatically on each billing cycle.</p>
              <div className="border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <span className="text-[18px] mt-0.5">⚠</span>
                <div className="flex-1">
                  <div className="font-medium text-amber-800 text-[14px] mb-1">Revoke auto-charge</div>
                  <div className="text-amber-700 text-[13px] mb-3">Revoking auto-charge will pause your subscription at the end of the current billing period. You'll need to manually renew to continue deliveries.</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#c00]" />
                    <span className="text-[13px] text-amber-800 font-medium">Revoke auto-charge authorisation</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── INVITE & EARN ── */}
            <div id="referral-section" className="bg-white border border-[#E5E2DA] p-6 mt-4">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-medium text-[16px]">Invite & Earn</h3>
                <span className="bg-[#F5B300] text-[#111] text-[10px] font-bold tracking-widest px-2 py-0.5 uppercase">$10 per referral</span>
              </div>
              <p className="text-[#888] text-[13px] mb-5">Refer a friend and earn $10 wallet credit when they complete their first order.</p>
              <div className="mb-4">
                <label className="block text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">Your referral link</label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 border border-[#D0CCC4] px-4 py-2.5 text-[14px] text-[#666] bg-[#F7F5F0] font-mono truncate">performancemeals.com.sg/ref/jerome</div>
                  <button onClick={() => save("Referral link copied!")} className="shrink-0 bg-[#111] text-white px-5 py-2.5 text-[12px] font-bold tracking-widest uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors whitespace-nowrap">Copy</button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">Invite by email</label>
                <div className="flex gap-2">
                  <input placeholder="friend@example.com" className="flex-1 min-w-0 border border-[#D0CCC4] px-4 py-2.5 text-[14px] outline-none focus:border-[#111] transition-colors" />
                  <button onClick={() => save("Invite sent!")} className="shrink-0 border border-[#111] text-[#111] px-5 py-2.5 text-[12px] font-bold tracking-widest uppercase hover:bg-[#111] hover:text-white transition-colors whitespace-nowrap">Send Invite</button>
                </div>
              </div>
              {/* Referral stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Friends Referred", value: "3" },
                  { label: "Total Earned", value: "$30.00" },
                  { label: "Pending", value: "$10.00" },
                ].map((s) => (
                  <div key={s.label} className="bg-[#111] p-3 sm:p-4 text-center">
                    <div className="text-[#F5B300] font-display text-[22px] font-bold">{s.value}</div>
                    <div className="text-white/40 text-[9px] sm:text-[10px] font-mono tracking-wider uppercase mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-3">Referral History</div>
                <div className="space-y-2">
                  {[
                    { name: "Sarah L.", date: "3 weeks ago", status: "completed", earned: "+$10.00" },
                    { name: "Marcus T.", date: "6 weeks ago", status: "completed", earned: "+$10.00" },
                    { name: "Priya S.", date: "2 days ago", status: "pending", earned: "Pending" },
                  ].map((r) => (
                    <div key={r.name} className="border border-[#E5E2DA] p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#F7F5F0] rounded-full flex items-center justify-center text-[13px] font-bold text-[#666]">
                          {r.name[0]}
                        </div>
                        <div>
                          <div className="text-[14px] font-medium">{r.name}</div>
                          <div className="text-[11px] text-[#888]">Referred {r.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider ${r.status === "completed" ? "bg-[#F5B300] text-[#111]" : "bg-[#F7F5F0] text-[#888] border border-[#D0CCC4]"}`}>
                          {r.status === "completed" ? "Paid" : "Awaiting Order"}
                        </span>
                        <div className={`text-[13px] font-bold ${r.status === "completed" ? "text-[#111]" : "text-[#888]"}`}>{r.earned}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#aaa] mt-3">Credit is paid when your friend completes their first order. Pending credits expire after 30 days if no order is placed.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MEAL SWAP MODAL ── */}
      {swapTarget && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSwapTarget(null)} />
          <div className="relative bg-white w-full max-w-[680px] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#E5E2DA]">
              <div>
                <h3 className="font-display text-[20px] font-bold">Swap Meal</h3>
                <p className="text-[#888] text-[12px] mt-0.5">{swapTarget.day} · Slot {swapTarget.slotIdx + 1} — pick a replacement</p>
              </div>
              <button onClick={() => setSwapTarget(null)} className="text-[#888] hover:text-[#111]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MEALS.filter((m) => m.cat !== "bundle").map((meal) => {
                const currentMealId = schedule[swapTarget.day]?.[swapTarget.slotIdx];
                const isCurrent = meal.id === currentMealId;
                return (
                  <button key={meal.id} onClick={() => { swapMeal(meal.id); save("Meal swapped successfully"); }}
                    className={`flex gap-3 p-3 text-left border transition-all hover:border-[#111] ${isCurrent ? "border-[#111] bg-[#F7F5F0]" : "border-[#E5E2DA]"}`}>
                    <img src={meal.img} alt={meal.name} className="w-16 h-16 object-cover shrink-0 bg-[#F0EDE8]" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium leading-snug">{meal.name}</div>
                      <div className="text-[11px] text-[#888] mt-1">{meal.protein}g pro · {meal.carbs}g carb · {meal.cal} cal</div>
                      {isCurrent && <div className="text-[10px] text-[#888] mt-1 font-mono uppercase tracking-wider">Current</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL SUBSCRIPTION MODAL ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white max-w-[480px] w-full p-8">
            <button onClick={() => setShowCancelModal(false)} className="absolute top-4 right-4 text-[#888] hover:text-[#111]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            {cancelStep === 1 ? (
              <>
                <h3 className="font-display text-[22px] font-bold mb-2">Are you sure you want to cancel?</h3>
                <p className="text-[#666] text-[13px] mb-6">Before you go, consider one of these alternatives:</p>
                <div className="space-y-3">
                  <button onClick={() => { setShowCancelModal(false); setShowPauseModal(true); }}
                    className="w-full text-left border border-[#E5E2DA] p-4 hover:border-[#111] transition-colors">
                    <div className="font-medium text-[14px]">⏸ Pause instead — keep my plan</div>
                    <div className="text-[#888] text-[12px] mt-0.5">No charges while paused. Your plan and meals are preserved.</div>
                  </button>
                  <button onClick={openCheaperPlanOptions}
                    className="w-full text-left border border-[#E5E2DA] p-4 hover:border-[#111] transition-colors">
                    <div className="font-medium text-[14px]">💰 Switch to a cheaper plan</div>
                    <div className="text-[#888] text-[12px] mt-0.5">Change your caloric target to reduce your weekly cost.</div>
                  </button>
                  <button onClick={() => setCancelStep(2)}
                    className="w-full text-left border border-[#c00]/30 p-4 hover:border-[#c00] transition-colors">
                    <div className="font-medium text-[14px] text-[#c00]">Yes, cancel my subscription</div>
                    <div className="text-[#888] text-[12px] mt-0.5">I understand my plan will end and I'll lose my streak.</div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-[22px] font-bold mb-2 text-[#c00]">Confirm cancellation</h3>
                <div className="bg-[#FFF5F5] border border-[#fcc] p-4 mb-6 text-[13px] text-[#c00]">
                  Your plan will end on <strong>30 Sep 2025</strong>. You'll lose your streak and rewards bonus.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCancelModal(false)} className="flex-1 border border-[#D0CCC4] py-3 text-[12px] font-bold uppercase text-[#888] hover:border-[#111] transition-colors">Keep My Plan</button>
                  <button onClick={() => { setSubCancelled(true); setShowCancelModal(false); save("Subscription cancelled"); }}
                    className="flex-1 bg-[#c00] text-white py-3 text-[12px] font-bold uppercase hover:bg-[#900] transition-colors">
                    Confirm Cancellation
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {reviewOrderId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReviewOrderId(null)} />
          <div className="relative bg-white max-w-[460px] w-full p-8">
            <button onClick={() => setReviewOrderId(null)} className="absolute top-4 right-4 text-[#888] hover:text-[#111]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <h3 className="font-display text-[22px] font-bold mb-1">Write a Review</h3>
            <p className="text-[#888] text-[13px] mb-5">Order: <span className="font-mono text-[#444]">{reviewOrderId}</span></p>
            <div className="mb-4">
              <div className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-2">Your rating</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewStars(star)} className={`text-[32px] transition-colors ${star <= reviewStars ? "text-[#F5B300]" : "text-[#D0CCC4]"}`}>★</button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">Your experience</label>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Tell us about your experience..." rows={4}
                className="w-full border border-[#D0CCC4] px-4 py-3 text-[14px] outline-none focus:border-[#111] transition-colors resize-none" />
            </div>
            <button onClick={() => { setReviewOrderId(null); save("Review submitted — thank you!"); }}
              className="w-full bg-[#111] text-white py-3 text-[12px] font-bold tracking-widest uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
              Submit Review
            </button>
          </div>
        </div>
      )}

      {/* ── WALLET TOP-UP MODAL ── */}
      {showTopUp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowTopUp(false); setTopUpDone(false); }} />
          <div className="relative bg-white w-full max-w-[440px] border border-[#E8E4DC]">
            <div className="bg-[#111] px-8 pt-7 pb-6">
              <button onClick={() => { setShowTopUp(false); setTopUpDone(false); }} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
              <div className="font-display text-[22px] font-bold text-white mb-0.5">
                {topUpDone ? <>Credit added<span className="text-[#F5B300]">.</span></> : <>Top up wallet<span className="text-[#F5B300]">.</span></>}
              </div>
              <p className="text-white/40 text-[12px]">
                {topUpDone ? "Your wallet has been topped up successfully." : "Funds are available instantly for your next order."}
              </p>
            </div>

            {!topUpDone ? (
              <div className="px-8 py-7">
                {/* Amount selector */}
                <div className="mb-5">
                  <label className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#888] mb-2">Select amount</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {PRESET_AMOUNTS.map((a) => (
                      <button key={a} onClick={() => setTopUpAmount(a)}
                        className={`py-2.5 border text-[13px] font-bold transition-colors ${topUpAmount === a ? "bg-[#111] text-white border-[#111]" : "border-[#D0CCC4] text-[#111] hover:border-[#111]"}`}>
                        ${a}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border border-[#D0CCC4] focus-within:border-[#111] transition-colors">
                    <span className="pl-4 text-[#888] text-[14px]">$</span>
                    <input type="number" min={5} max={500} value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value))}
                      className="flex-1 py-3 pr-4 text-[14px] outline-none bg-transparent" placeholder="Other amount" />
                  </div>
                </div>

                {/* Card fields */}
                <div className="mb-3">
                  <label className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">Cardholder name</label>
                  <input value={topUpName} onChange={(e) => { setTopUpName(e.target.value); setTopUpError(false); }} placeholder="Jerome Tan"
                    className={`w-full border px-4 py-3 text-[14px] outline-none transition-colors ${topUpError && !topUpName ? "border-red-400 bg-red-50" : "border-[#D0CCC4] focus:border-[#111]"}`} />
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">Card number</label>
                  <input value={topUpCard} onChange={(e) => { setTopUpCard(e.target.value); setTopUpError(false); }} placeholder="1234 5678 9012 3456"
                    className={`w-full border px-4 py-3 text-[14px] outline-none font-mono transition-colors ${topUpError && !topUpCard ? "border-red-400 bg-red-50" : "border-[#D0CCC4] focus:border-[#111]"}`} />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <label className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">Expiry</label>
                    <input value={topUpExpiry} onChange={(e) => { setTopUpExpiry(e.target.value); setTopUpError(false); }} placeholder="MM / YY"
                      className={`w-full border px-4 py-3 text-[14px] outline-none font-mono transition-colors ${topUpError && !topUpExpiry ? "border-red-400 bg-red-50" : "border-[#D0CCC4] focus:border-[#111]"}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono tracking-[0.2em] uppercase text-[#888] mb-1.5">CVC</label>
                    <input value={topUpCvc} onChange={(e) => { setTopUpCvc(e.target.value); setTopUpError(false); }} placeholder="•••"
                      className={`w-full border px-4 py-3 text-[14px] outline-none font-mono transition-colors ${topUpError && !topUpCvc ? "border-red-400 bg-red-50" : "border-[#D0CCC4] focus:border-[#111]"}`} />
                  </div>
                </div>

                {topUpError && (
                  <div className="bg-red-50 border border-red-200 px-4 py-3 text-[12px] text-red-700 mb-4">
                    Please fill in all card details to continue.
                  </div>
                )}

                <div className="bg-[#F7F5F0] border border-[#E5E2DA] px-4 py-3 text-[12px] text-[#666] mb-5 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Secured by 256-bit SSL. Card details are not stored.
                </div>

                <button onClick={handleTopUp}
                  className="w-full bg-[#111] text-white py-3.5 text-[12px] font-bold tracking-widest uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                  Add ${topUpAmount} to Wallet
                </button>
              </div>
            ) : (
              <div className="px-8 py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#F5B300] rounded-full flex items-center justify-center mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <p className="text-[20px] font-display font-bold text-[#111] mb-1">${topUpAmount} added!</p>
                <p className="text-[13px] text-[#888] mb-6">Your new wallet balance is <strong className="text-[#111]">${(12.50 + topUpAmount).toFixed(2)}</strong></p>
                <div className="w-full bg-[#075E54] text-white px-5 py-3 flex items-center gap-3 mb-2">
                  <span className="text-[18px]">💬</span>
                  <div className="text-left flex-1">
                    <div className="text-[12px] font-semibold">WhatsApp receipt sent</div>
                    <div className="text-[11px] text-white/50">+65 9123 4567</div>
                  </div>
                  <span className="text-[#25D366] text-[11px] font-bold">✓ Sent</span>
                </div>
                <div className="w-full bg-[#111] text-white px-5 py-3 flex items-center gap-3 mb-6">
                  <span className="text-[18px]">✉️</span>
                  <div className="text-left flex-1">
                    <div className="text-[12px] font-semibold">Email receipt sent</div>
                    <div className="text-[11px] text-white/50">jerome@email.com</div>
                  </div>
                  <span className="text-[#F5B300] text-[11px] font-bold">✓ Sent</span>
                </div>
                <button onClick={() => { setShowTopUp(false); setTopUpDone(false); save("Wallet topped up — $" + topUpAmount + " added!"); }}
                  className="w-full bg-[#F5B300] text-[#111] py-3.5 text-[12px] font-bold tracking-widest uppercase hover:bg-[#111] hover:text-white transition-colors">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pause modal (dashboard shortcut) */}
      {showPauseModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPauseModal(false)} />
          <div className="relative bg-white max-w-[440px] w-full p-8">
            <h3 className="font-display text-[24px] font-bold mb-3">Pause your plan</h3>
            <p className="text-[#666] text-[14px] mb-6">No deliveries or charges during the pause. Your plan resumes automatically.</p>
            <div className="flex flex-col gap-2 mb-5">
              {[1, 2, 3, 4].map((w) => {
                const start = new Date(); start.setDate(start.getDate() + 1);
                const end = new Date(start); end.setDate(end.getDate() + w * 7 - 1);
                const resumeDate = new Date(end); resumeDate.setDate(resumeDate.getDate() + 1);
                const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                return (
                  <button key={w} onClick={() => setPauseWeeks(w)}
                    className={`flex items-center justify-between px-5 py-3.5 border transition-all ${pauseWeeks === w ? "bg-[#111] text-white border-[#111]" : "border-[#D0CCC4] hover:border-[#111]"}`}>
                    <div className="text-left">
                      <div className={`text-[14px] font-bold ${pauseWeeks === w ? "text-white" : "text-[#111]"}`}>{w} week{w > 1 ? "s" : ""}</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${pauseWeeks === w ? "text-white/50" : "text-[#888]"}`}>{fmt(start)} – {fmt(end)}</div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className={`text-[10px] uppercase tracking-wider ${pauseWeeks === w ? "text-white/40" : "text-[#aaa]"}`}>resumes</div>
                      <div className={`text-[12px] font-semibold ${pauseWeeks === w ? "text-[#F5B300]" : "text-[#555]"}`}>{fmt(resumeDate)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPauseModal(false)} className="flex-1 border border-[#D0CCC4] py-3 text-[12px] font-bold uppercase text-[#888] hover:border-[#111] transition-colors">Cancel</button>
              <button onClick={() => { setSubPaused(true); setShowPauseModal(false); save(`Plan paused for ${pauseWeeks} week${pauseWeeks > 1 ? "s" : ""}`); }}
                className="flex-1 bg-[#111] text-white py-3 text-[12px] font-bold uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
