import { useState } from "react";
import { Page, CartItem } from "@/data";
import { ReadySeriesLogo } from "@/components/Logos";

interface Props {
  navigate: (page: Page) => void;
  addToCart: (item: CartItem) => void;
  cart: CartItem[];
  onSelectMeal: (id: number) => void;
  setCartOpen: (v: boolean) => void;
}

const MEALS = [
  { id: 101, name: "Teriyaki Chicken & Brown Rice", cat: "Just Protein", price: 12.90, protein: 42, carbs: 48, fat: 8, cal: 478, badge: "BESTSELLER", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" },
  { id: 102, name: "Spicy Korean Beef Bulgogi", cat: "Low Carb", price: 13.50, protein: 38, carbs: 12, fat: 14, cal: 326, badge: "HOT", img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80" },
  { id: 103, name: "Herb Chicken & Roasted Veg", cat: "Low Carb", price: 12.50, protein: 36, carbs: 14, fat: 10, cal: 290, badge: null, img: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&q=80" },
  { id: 104, name: "Salmon & Quinoa Power Bowl", cat: "Just Protein", price: 15.90, protein: 44, carbs: 38, fat: 16, cal: 468, badge: "NEW", img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80" },
  { id: 105, name: "Thai Basil Pork Rice Bowl", cat: "High Carb", price: 11.90, protein: 28, carbs: 62, fat: 8, cal: 436, badge: null, img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80" },
  { id: 106, name: "Miso Glazed Salmon", cat: "Just Protein", price: 16.90, protein: 46, carbs: 18, fat: 18, cal: 414, badge: "PREMIUM", img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80" },
  { id: 107, name: "Overnight Oats & Berry", cat: "High Carb", price: 8.90, protein: 18, carbs: 52, fat: 6, cal: 334, badge: null, img: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&q=80" },
  { id: 108, name: "Greek Chicken Wrap", cat: "Just Protein", price: 12.90, protein: 34, carbs: 36, fat: 10, cal: 374, badge: null, img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80" },
  { id: 109, name: "Egg White & Avocado Toast", cat: "High Carb", price: 9.50, protein: 22, carbs: 34, fat: 12, cal: 332, badge: "POPULAR", img: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80" },
  { id: 110, name: "Beef Rendang & Cauliflower", cat: "Low Carb", price: 14.90, protein: 40, carbs: 10, fat: 22, cal: 398, badge: null, img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80" },
  { id: 111, name: "Chicken Burrito Bowl", cat: "High Carb", price: 12.50, protein: 30, carbs: 58, fat: 10, cal: 450, badge: null, img: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80" },
  { id: 112, name: "Prawn Fried Rice", cat: "High Carb", price: 13.90, protein: 26, carbs: 60, fat: 8, cal: 428, badge: "BESTSELLER", img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80" },
];

const CATS = ["A-la-carte", "Low Carb", "High Carb", "Just Protein"];

const PREDEFINED_BUNDLES = [
  {
    category: "Low Carb Meals",
    color: "#F5B300",
    items: [
      { name: "Signature 5 — Non-Beef", variant: "Non-Beef", desc: "Our most-loved low carb flavours, curated for you. 3% bundle discount applied.", badge: "POPULAR", price: 48.99, meals: 5,
        mealIds: [103, 104, 106, 108, 109] },
      { name: "Signature 5 — Beef",     variant: "Beef",     desc: "Best-selling beef low carb options in one bundle. 3% bundle discount applied.", badge: null, price: 48.99, meals: 5,
        mealIds: [102, 110, 102, 110, 102] },
      { name: "9 Flavours of the Month",variant: null,       desc: "9 rotating seasonal low carb meals, refreshed monthly. 5% bundle discount applied.", badge: "NEW", price: 86.55, meals: 9,
        mealIds: [103, 104, 106, 108, 109, 102, 110, 103, 106] },
      { name: "Essential 10 — Non-Beef",variant: "Non-Beef", desc: "Top up your fridge with essential low carb staples. 7% bundle discount applied.", badge: null, price: 93.00, meals: 10,
        mealIds: [103, 104, 106, 108, 109, 103, 104, 106, 108, 109] },
      { name: "Essential 10 — Beef",    variant: "Beef",     desc: "Beef-based essentials to keep your macros on track. 7% bundle discount applied.", badge: null, price: 93.00, meals: 10,
        mealIds: [102, 110, 102, 110, 102, 110, 102, 110, 102, 110] },
    ],
  },
  {
    category: "High Carb Meals",
    color: "#F5B300",
    items: [
      { name: "Signature 5 — Non-Beef", variant: "Non-Beef", desc: "High carb performance meals for fuel-heavy days. 3% bundle discount applied.", badge: "POPULAR", price: 48.99, meals: 5,
        mealIds: [107, 109, 111, 112, 105] },
      { name: "Signature 5 — Beef",     variant: "Beef",     desc: "Beef-based high carb signatures for sustained energy. 3% bundle discount applied.", badge: null, price: 48.99, meals: 5,
        mealIds: [105, 112, 111, 105, 112] },
      { name: "9 Flavours of the Month",variant: null,       desc: "9 rotating seasonal high carb meals, refreshed monthly. 5% bundle discount applied.", badge: "NEW", price: 88.45, meals: 9,
        mealIds: [107, 109, 111, 112, 105, 107, 111, 112, 109] },
      { name: "Essential 10 — Non-Beef",variant: "Non-Beef", desc: "Restock your week with non-beef high carb essentials. 7% bundle discount applied.", badge: null, price: 93.00, meals: 10,
        mealIds: [107, 109, 111, 112, 105, 107, 109, 111, 112, 105] },
      { name: "Essential 10 — Beef",    variant: "Beef",     desc: "Beef high carb top-up for active weeks. 7% bundle discount applied.", badge: null, price: 93.00, meals: 10,
        mealIds: [105, 112, 111, 105, 112, 111, 105, 112, 111, 105] },
    ],
  },
  {
    category: "Just Protein",
    color: "#F5B300",
    items: [
      { name: "JP Variety Bundle of 10", variant: null, desc: "10-meal variety of high-protein just protein serves. 3% bundle discount applied.", badge: "BESTSELLER", price: 55.10, meals: 10,
        mealIds: [101, 104, 106, 108, 101, 104, 106, 108, 101, 104] },
    ],
  },
  {
    category: "Mixed Bundle",
    color: "#F5B300",
    items: [
      { name: "7 Low Carb + 7 Just Protein",  variant: "Non-Beef", desc: "14-meal mixed bundle: 7 low carb + 7 just protein serves. 7% bundle discount applied.", badge: "BEST VALUE", price: 118.30, meals: 14,
        mealIds: [103, 104, 106, 108, 109, 103, 106, 101, 104, 106, 108, 101, 104, 106] },
      { name: "7 High Carb + 7 Just Protein", variant: "Non-Beef", desc: "14-meal mixed bundle: 7 high carb + 7 just protein serves. 7% bundle discount applied.", badge: null, price: 117.37, meals: 14,
        mealIds: [107, 109, 111, 112, 105, 107, 109, 101, 104, 106, 108, 101, 104, 108] },
    ],
  },
];

const SUBSCRIPTION_PRODUCTS = [
  { sku: "JPSUB01", name: "Just Protein",         variant: "Non-Beef", items: 14, price3m: 252.90, price6m: 480.50, badge: null },
  { sku: "JPSUB02", name: "Just Protein",         variant: "Beef",     items: 14, price3m: 252.90, price6m: 480.50, badge: null },
  { sku: "LCSUB01", name: "Low Carb Meals",       variant: "Non-Beef", items: 10, price3m: 303.00, price6m: 575.70, badge: "POPULAR" },
  { sku: "LCSUB02", name: "Low Carb Meals",       variant: "Beef",     items: 10, price3m: 303.00, price6m: 575.70, badge: null },
  { sku: "HCSUB01", name: "High Carb Meals",      variant: "Non-Beef", items: 10, price3m: 303.00, price6m: 575.70, badge: null },
  { sku: "HCSUB02", name: "High Carb Meals",      variant: "Beef",     items: 10, price3m: 303.00, price6m: 575.70, badge: null },
  { sku: "LCMIXSUB01", name: "Low Carb + Just Protein",  variant: "Non-Beef", items: 15, price3m: 354.56, price6m: 693.90, badge: "BEST VALUE" },
  { sku: "LCMIXSUB02", name: "Low Carb + Just Protein",  variant: "Beef",     items: 15, price3m: 354.56, price6m: 693.90, badge: null },
  { sku: "HCMIXSUB01", name: "High Carb + Just Protein", variant: "Non-Beef", items: 15, price3m: 354.56, price6m: 693.90, badge: null },
  { sku: "HCMIXSUB02", name: "High Carb + Just Protein", variant: "Beef",     items: 15, price3m: 354.56, price6m: 693.90, badge: null },
];

const SUB_MEAL_DETAILS: Record<string, {
  meals: { id: number; qty: number }[];
  alaCarteAvg: number;
  accentColor: string;
  highlights: string[];
}> = {
  JPSUB01: {
    meals: [{ id: 101, qty: 4 }, { id: 104, qty: 4 }, { id: 106, qty: 3 }, { id: 108, qty: 3 }],
    alaCarteAvg: 14.65,
    accentColor: "#F5B300",
    highlights: ["44–46g protein per meal", "Zero rice or bread fillers", "Premium salmon & chicken"],
  },
  JPSUB02: {
    meals: [{ id: 101, qty: 5 }, { id: 106, qty: 5 }, { id: 108, qty: 4 }],
    alaCarteAvg: 14.23,
    accentColor: "#F5B300",
    highlights: ["46g protein per meal", "Chicken & salmon rotation", "Lean, high-output fuel"],
  },
  LCSUB01: {
    meals: [{ id: 103, qty: 2 }, { id: 104, qty: 2 }, { id: 106, qty: 2 }, { id: 108, qty: 2 }, { id: 109, qty: 2 }],
    alaCarteAvg: 13.54,
    accentColor: "#34D399",
    highlights: ["Under 14g net carbs per meal", "No beef — lighter proteins", "Cut-phase friendly"],
  },
  LCSUB02: {
    meals: [{ id: 102, qty: 5 }, { id: 110, qty: 5 }],
    alaCarteAvg: 14.20,
    accentColor: "#34D399",
    highlights: ["Gochujang beef & rendang", "Under 12g net carbs", "Satiety on a deficit"],
  },
  HCSUB01: {
    meals: [{ id: 107, qty: 2 }, { id: 109, qty: 2 }, { id: 111, qty: 2 }, { id: 112, qty: 2 }, { id: 105, qty: 2 }],
    alaCarteAvg: 11.34,
    accentColor: "#60A5FA",
    highlights: ["52–62g carbs per meal", "Ideal for training days", "Rice, oats & bowl variety"],
  },
  HCSUB02: {
    meals: [{ id: 105, qty: 4 }, { id: 112, qty: 3 }, { id: 111, qty: 3 }],
    alaCarteAvg: 12.77,
    accentColor: "#60A5FA",
    highlights: ["Beef & prawn variety", "58–62g carbs per meal", "Fuel for heavy lift days"],
  },
  LCMIXSUB01: {
    meals: [{ id: 103, qty: 2 }, { id: 104, qty: 2 }, { id: 106, qty: 2 }, { id: 109, qty: 2 }, { id: 101, qty: 4 }, { id: 108, qty: 3 }],
    alaCarteAvg: 14.10,
    accentColor: "#A78BFA",
    highlights: ["7 Low Carb + 8 Just Protein", "Best savings per meal in range", "Split for cut & muscle-hold days"],
  },
  LCMIXSUB02: {
    meals: [{ id: 102, qty: 3 }, { id: 110, qty: 4 }, { id: 101, qty: 4 }, { id: 106, qty: 2 }, { id: 108, qty: 2 }],
    alaCarteAvg: 14.22,
    accentColor: "#A78BFA",
    highlights: ["Beef cuts + JP rotation", "Low carb + high protein split", "Serious cut protocol"],
  },
  HCMIXSUB01: {
    meals: [{ id: 107, qty: 2 }, { id: 111, qty: 2 }, { id: 112, qty: 2 }, { id: 101, qty: 3 }, { id: 104, qty: 3 }, { id: 106, qty: 3 }],
    alaCarteAvg: 12.99,
    accentColor: "#FB923C",
    highlights: ["8 High Carb + 7 Just Protein", "Fuel heavy sessions & recover fast", "Best of carbs + protein"],
  },
  HCMIXSUB02: {
    meals: [{ id: 105, qty: 3 }, { id: 112, qty: 3 }, { id: 111, qty: 2 }, { id: 101, qty: 3 }, { id: 106, qty: 2 }, { id: 108, qty: 2 }],
    alaCarteAvg: 13.50,
    accentColor: "#FB923C",
    highlights: ["Beef + prawn + JP rotation", "Performance carb-loading", "Best of both worlds"],
  },
};

const FREE_DELIVERY_THRESHOLD = 120;
const DELIVERY_FEE = 10;

const promos = [
  { code: "READY20", desc: "20% off your first Ready Series order", expires: "30 Sep 2026" },
  { code: "SG61", desc: "$6.10 off — Singapore National Day special", expires: "Ongoing" },
  { code: "FREEZER5", desc: "$5 off orders of 10+ meals", expires: "15 Oct 2026" },
];

const MEAL_REVIEWS: Record<number, { author: string; rating: number; text: string; date: string }[]> = {
  101: [
    { author: "Marcus T.", rating: 5, text: "Best meal prep chicken I have ever had. The teriyaki glaze is spot-on and the brown rice keeps me full till 5pm.", date: "12 Sep" },
    { author: "Rena L.", rating: 5, text: "Ordered 10 of these. Zero regrets. My whole office is jealous at lunchtime.", date: "8 Sep" },
    { author: "Kevin P.", rating: 4, text: "Really solid. Portion size is generous and macros are exactly as listed. Would add 5 stars if carbs were slightly lower.", date: "1 Sep" },
  ],
  104: [
    { author: "Sophie H.", rating: 5, text: "Salmon is perfectly cooked even after freezing — huge win. The quinoa absorbs the sauce beautifully.", date: "10 Sep" },
    { author: "Jared Ng.", rating: 5, text: "Worth every cent at $15.90. Tastes like a restaurant bowl. Easy 5/5.", date: "5 Sep" },
  ],
  106: [
    { author: "Amir R.", rating: 5, text: "Premium price, premium taste. The miso glaze caramelises perfectly in the microwave. Unbelievable.", date: "11 Sep" },
    { author: "Lin Y.", rating: 4, text: "Excellent flavour. Salmon was a tiny bit dry on the edges but still very enjoyable. Will reorder.", date: "7 Sep" },
  ],
  102: [
    { author: "Brian K.", rating: 5, text: "Genuinely spicy — exactly as advertised. Low carb but still super satisfying. Great for cut phase.", date: "9 Sep" },
    { author: "Priya S.", rating: 4, text: "Good flavour, solid protein. Spice level is a little high for me but I keep ordering it anyway.", date: "4 Sep" },
  ],
};

export default function ReadySeriesPage({ navigate, addToCart, cart, onSelectMeal, setCartOpen }: Props) {
  const [theme, setTheme] = useState<"dark" | "warm" | "espresso">("dark");
  const th = <T,>(d: T, w: T, e: T): T => (
    theme === "dark" ? d : theme === "warm" ? w : e
  );
  const [purchaseMode, setPurchaseMode] = useState<"single" | "bundles" | "subscription">("single");
  const [subTerm, setSubTerm] = useState<3 | 6>(3);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [subTypeFilter, setSubTypeFilter] = useState<"meals" | "protein" | "mixed">("meals");
  const [rsSignedIn, setRsSignedIn] = useState(false);
  const [showRsAuthGate, setShowRsAuthGate] = useState(false);
  const [pendingSubSku, setPendingSubSku] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState("A-la-carte");
  const [addedId, setAddedId] = useState<number | null>(null);
  const [reviewMealId, setReviewMealId] = useState<number | null>(null);
  const [carouselOffsets, setCarouselOffsets] = useState<Record<string, number>>({});

  const scrollCarousel = (bundleName: string, dir: 1 | -1) => {
    setCarouselOffsets((prev) => {
      const current = prev[bundleName] ?? 0;
      const next = current + dir * 120;
      return { ...prev, [bundleName]: Math.max(0, next) };
    });
  };

  const filtered = (activeCat === "All" || activeCat === "A-la-carte") ? MEALS : MEALS.filter((m) => m.cat === activeCat);

  const handleAdd = (meal: typeof MEALS[0]) => {
    addToCart({
      id: meal.id,
      name: meal.name,
      price: meal.price,
      qty: 1,
      img: meal.img,
      type: "ready",
    });
    setAddedId(meal.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  const cartItems = cart.filter((i) => i.type === "ready" || i.type === "box");
  const cartQty = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.filter((i) => i.type === "ready" || i.type === "box").reduce((s, i) => s + i.price * i.qty, 0);
  const toFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - cartTotal);
  const freeDeliveryPct = Math.min(100, (cartTotal / FREE_DELIVERY_THRESHOLD) * 100);
  const deliveryFee = cartTotal > 0 ? (cartTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE) : 0;

  return (
    <div className="bg-[#1A1A1A] text-white min-h-screen">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden min-h-[75svh] flex items-center">
        {/* Full-bleed food photo background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1543352632-5a4b24e4d2a6?w=1600&h=900&fit=crop&auto=format&q=80"
            alt="Ready-Series meal prep containers"
            className="w-full h-full object-cover object-center"
          />
          {/* Heavy charcoal overlay with yellow undertone — keeps e-commerce energy, not boutique softness */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(100deg, rgba(16,16,16,0.97) 0%, rgba(16,16,16,0.90) 45%, rgba(16,16,16,0.65) 75%, rgba(16,16,16,0.3) 100%)" }} />
          {/* Yellow burst — top right, energetic */}
          <div className="absolute top-0 right-0 w-[600px] h-[400px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 85% 10%, rgba(245,179,0,0.28) 0%, transparent 60%)" }} />
        </div>

        {/* Yellow top bar — brand identifier stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5B300] z-20" />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 sm:px-8 py-20 sm:py-24">
          <button onClick={() => navigate("home")} className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-colors text-[11px] font-mono tracking-widest uppercase mb-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Performance Meals
          </button>

          <div className="mb-7">
            <ReadySeriesLogo size="md" variant="dark" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[11px] font-mono tracking-[0.4em] uppercase text-[#F5B300] mb-5">Everyday Momentum</p>
              <h1 className="font-display text-[36px] sm:text-[52px] lg:text-[68px] font-extrabold leading-[0.88] mb-6">
                FROZEN AT PEAK.<br /><span className="text-[#F5B300]">READY ON DEMAND.</span>
              </h1>
              <p className="text-white/50 text-[15px] leading-relaxed max-w-[420px] mb-8">
                Fast, enjoyable frozen meals that are ready when life gets busy. Keep your week moving.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => document.getElementById("rs-shop")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-3 bg-[#F5B300] text-[#1A1A1A] px-8 py-4 font-extrabold text-[12px] tracking-[0.2em] uppercase hover:bg-white transition-colors">
                  Shop Now
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                </button>
              </div>
            </div>

            {/* Stats — energetic tiles, yellow-accented */}
            <div className="grid grid-cols-3 gap-3 lg:justify-items-end">
              {[
                { v: "3 min", l: "Ready to eat" },
                { v: "40+", l: "Meal options" },
                { v: "$8.90", l: "From" },
              ].map((s) => (
                <div key={s.l} className="border border-[#F5B300]/25 bg-[#F5B300]/5 px-4 py-5 text-center">
                  <div className="text-[#F5B300] font-display text-[28px] sm:text-[32px] font-extrabold leading-none">{s.v}</div>
                  <div className="text-white/40 text-[10px] tracking-wide mt-2 uppercase">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE PROMOS BAR ── */}
      <div className="bg-[#F5B300]/8 border-y border-[#F5B300]/15 px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-8">
          <div className="text-[#F5B300] text-[10px] font-mono tracking-[0.3em] uppercase shrink-0">Active Promos</div>
          <div className="flex flex-wrap gap-4">
            {promos.map((p) => (
              <div key={p.code} className="flex items-center gap-2">
                <span className="bg-[#F5B300] text-[#111] text-[9px] font-extrabold px-2 py-0.5 tracking-wider">{p.code}</span>
                <span className="text-white/50 text-[11px]">{p.desc}</span>
                <span className="text-white/20 text-[10px] font-mono">{p.expires}</span>
              </div>
            ))}
          </div>
          <div className="ml-auto text-[10px] text-white/25 hidden lg:block">Enter code at checkout</div>
        </div>
      </div>

      {/* ── FREE DELIVERY PROGRESS — single/bundle only ── */}
      {purchaseMode !== "subscription" && (
        <div className="bg-[#111] border-b border-white/5 px-6 py-3">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#F5B300] rounded-full transition-all duration-500" style={{ width: `${freeDeliveryPct}%` }} />
              </div>
              <div className="text-[11px] shrink-0">
                {toFreeDelivery <= 0
                  ? <span className="text-[#F5B300] font-bold">🎉 Free delivery unlocked!</span>
                  : <span className="text-white/40">Add <span className="text-white font-semibold">${toFreeDelivery.toFixed(2)}</span> more for free delivery</span>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT THEME PICKER ── */}
      <div className="bg-[#1A1A1A] border-b border-white/10 px-6 py-5">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[#F5B300] text-[9px] font-mono tracking-[0.35em] uppercase mb-1">Design Preview</div>
              <p className="text-white/40 text-[12px]">Three directions for your team to review — pick the one that fits best.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {([
                {
                  key: "dark" as const,
                  label: "A — Cold Dark",
                  sub: "Athletic · High contrast",
                  swatches: ["#111111", "#1A1A1A", "#F5B300"],
                  border: "border-white/20",
                  activeBorder: "border-[#F5B300]",
                },
                {
                  key: "warm" as const,
                  label: "B — Warm Cream",
                  sub: "Food-first · Appetising",
                  swatches: ["#FAF8F4", "#FFFFFF", "#F5B300"],
                  border: "border-white/20",
                  activeBorder: "border-[#F5B300]",
                },
                {
                  key: "espresso" as const,
                  label: "C — Espresso",
                  sub: "Restaurant warmth · Premium",
                  swatches: ["#1C1108", "#2A1C0D", "#F5B300"],
                  border: "border-white/20",
                  activeBorder: "border-[#F5B300]",
                },
              ]).map((opt) => {
                const active = theme === opt.key;
                return (
                  <button key={opt.key} onClick={() => setTheme(opt.key)}
                    className={`text-left px-4 py-3 border transition-all ${active ? opt.activeBorder + " bg-white/5" : opt.border + " bg-transparent hover:bg-white/4"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {opt.swatches.map((s, i) => (
                        <div key={i} className="w-4 h-4 rounded-sm border border-white/10" style={{ background: s }} />
                      ))}
                    </div>
                    <div className={`text-[12px] font-extrabold tracking-wide ${active ? "text-[#F5B300]" : "text-white/60"}`}>{opt.label}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── PURCHASE MODE TABS ── */}
      <div id="rs-shop" className={`border-b ${th("bg-[#111] border-white/8", "bg-white border-black/8", "bg-[#1C1108] border-[#F5EDD8]/8")}`}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex overflow-x-auto">
            {([
              { key: "single" as const,       label: "Single Purchase", sub: "Individual meals" },
              { key: "bundles" as const,       label: "Bundles",         sub: "Predefined packs" },
              { key: "subscription" as const,  label: "Subscription",    sub: "3 or 6 months" },
            ]).map((m) => (
              <button key={m.key} onClick={() => setPurchaseMode(m.key)}
                className={`shrink-0 px-5 sm:px-6 py-4 text-left transition-all border-b-2 ${purchaseMode === m.key ? "border-[#F5B300]" : "border-transparent"} ${purchaseMode === m.key ? th("text-white", "text-[#1A1A1A]", "text-[#F5EDD8]") : th("text-white/35 hover:text-white/70", "text-black/30 hover:text-black/60", "text-[#F5EDD8]/35 hover:text-[#F5EDD8]/70")}`}>
                <div className="text-[12px] font-bold tracking-wide whitespace-nowrap">{m.label}</div>
                <div className={`text-[10px] mt-0.5 whitespace-nowrap ${th("text-white/30", "text-black/30", "text-[#F5EDD8]/30")}`}>{m.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BUNDLES TAB ── */}
      {purchaseMode === "bundles" && (
      <section className={`py-16 px-6 sm:px-8 ${th("bg-[#111]", "bg-[#FAF8F4]", "bg-[#1C1108]")}`}>
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <p className={`text-[11px] font-mono tracking-[0.4em] uppercase mb-3 text-[#F5B300]`}>Predefined Bundles</p>
            <h2 className={`font-display text-[38px] sm:text-[52px] font-extrabold leading-[0.92] ${th("text-white", "text-[#1A1A1A]", "text-[#F5EDD8]")}`}>Choose your bundle<span className="text-[#F5B300]">.</span></h2>
            <p className={`text-[15px] mt-3 max-w-[500px] ${th("text-white/40", "text-[#555]", "text-[#F5EDD8]/50")}`}>All bundles are curated and ready to go — pick the category and size that suits your week.</p>
          </div>

          <div className="space-y-14">
            {PREDEFINED_BUNDLES.map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`text-[11px] font-mono tracking-[0.4em] uppercase font-bold ${th("text-white/50", "text-[#1A1A1A]/60", "text-[#F5EDD8]/50")}`}>{group.category}</div>
                  <div className={`flex-1 h-px ${th("bg-white/8", "bg-black/10", "bg-[#F5EDD8]/10")}`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.items.map((item) => {
                    const previewMeals = item.mealIds
                      .filter((id, idx, arr) => arr.indexOf(id) === idx)
                      .slice(0, 3)
                      .map((id) => MEALS.find((m) => m.id === id))
                      .filter(Boolean) as typeof MEALS;
                    return (
                    <div key={item.name} className={`flex flex-col hover:border-[#F5B300]/70 transition-all duration-300 group overflow-hidden border ${th("bg-[#1A1A1A] border-white/8", "bg-white border-[#E8E2D9] shadow-sm hover:shadow-md", "bg-[#2A1C0D] border-[#F5EDD8]/10")}`}>
                      {/* Meal image strip */}
                      <div className="flex h-28 overflow-hidden">
                        {previewMeals.map((m, pi) => (
                          <div key={pi} className="flex-1 overflow-hidden">
                            <img src={m.img} alt={m.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${theme !== "warm" ? "opacity-80 group-hover:opacity-100" : ""}`} />
                          </div>
                        ))}
                        {previewMeals.length === 0 && <div className={`flex-1 ${th("bg-[#222]", "bg-[#F0EBE3]", "bg-[#3A2810]")}`} />}
                      </div>

                      <div className="p-5 flex flex-col gap-3 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className={`text-[14px] font-extrabold leading-snug ${th("text-white", "text-[#1A1A1A]", "text-[#F5EDD8]")}`}>{item.name}</div>
                            {item.variant && (
                              <div className={`text-[10px] font-mono tracking-widest uppercase mt-1 ${th("text-white/30", "text-[#999]", "text-[#F5EDD8]/35")}`}>{item.variant}</div>
                            )}
                          </div>
                          {item.badge && (
                            <span className="bg-[#F5B300] text-[#1A1A1A] text-[8px] font-extrabold tracking-[0.15em] uppercase px-2 py-1 shrink-0">{item.badge}</span>
                          )}
                        </div>
                        <p className={`text-[12px] leading-relaxed flex-1 ${th("text-white/40", "text-[#666]", "text-[#F5EDD8]/45")}`}>{item.desc}</p>

                        {/* Meal name pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {previewMeals.map((m) => (
                            <span key={m.id} className={`text-[10px] px-2 py-0.5 leading-snug border ${th("bg-white/5 border-white/10 text-white/50", "bg-[#FAF8F4] border-[#E0D9CE] text-[#555]", "bg-[#F5EDD8]/5 border-[#F5EDD8]/12 text-[#F5EDD8]/55")}`}>{m.name}</span>
                          ))}
                          {item.mealIds.filter((id, idx, arr) => arr.indexOf(id) === idx).length > 3 && (
                            <span className="text-[10px] px-2 py-0.5 font-semibold border bg-[#F5B300]/10 border-[#F5B300]/30 text-[#F5B300]">+{item.mealIds.filter((id, idx, arr) => arr.indexOf(id) === idx).length - 3} more</span>
                          )}
                        </div>

                        <div className={`flex items-end justify-between pt-2 border-t ${th("border-white/8", "border-[#E8E2D9]", "border-[#F5EDD8]/10")}`}>
                          <div>
                            <span className={`font-display text-[22px] font-extrabold ${th("text-white", "text-[#1A1A1A]", "text-[#F5EDD8]")}`}>${item.price.toFixed(2)}</span>
                            <span className={`text-[11px] ml-1.5 ${th("text-white/30", "text-[#999]", "text-[#F5EDD8]/35")}`}>{item.meals} meals · ${(item.price / item.meals).toFixed(2)}/meal</span>
                          </div>
                        </div>
                      <button
                        onClick={() => {
                          const bundleMeals = item.mealIds.map((id) => MEALS.find((m) => m.id === id)).filter(Boolean) as typeof MEALS;
                          addToCart({
                            id: parseInt(`${group.category.charCodeAt(0)}${item.name.charCodeAt(0)}${item.price * 100}`),
                            name: item.name,
                            price: item.price,
                            qty: 1,
                            img: bundleMeals[0]?.img ?? "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&h=200&fit=crop&auto=format",
                            type: "box",
                            mealNames: bundleMeals.map((m) => m.name),
                            mealImgs: bundleMeals.map((m) => m.img),
                          });
                        }}
                        className={`w-full py-3 text-[11px] font-extrabold tracking-[0.15em] uppercase transition-colors ${th("bg-[#F5B300] text-[#1A1A1A] hover:bg-white", "bg-[#1A1A1A] text-white hover:bg-[#F5B300] hover:text-[#1A1A1A]", "bg-[#F5B300] text-[#1C1108] hover:bg-[#F5EDD8]")}`}>
                        Add to Cart →
                      </button>
                      </div>{/* p-5 */}
                    </div>/* card */
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-10 p-5 text-[12px] border ${th("bg-white/3 border-white/8 text-white/35", "bg-[#FFF8E8] border-[#F5B300]/30 text-[#888]", "bg-[#F5EDD8]/5 border-[#F5EDD8]/10 text-[#F5EDD8]/40")}`}>
            🚚 Free delivery on orders $120 and above · $10 delivery fee below $120
          </div>
        </div>
      </section>
      )}

      {/* ── SUBSCRIPTION TAB ── */}
      {purchaseMode === "subscription" && (
      <div className="bg-[#0D0D0D]">
        {/* Trust bar */}
        <div className="bg-[#F5B300] py-2.5 px-6">
          <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-[#111] text-[10px] font-extrabold tracking-[0.15em] uppercase">
            {[
              { icon: "🚚", text: "Free delivery on all subscriptions" },
              { icon: "↩", text: "Pause or cancel anytime" },
              { icon: "🔄", text: "Monthly meal rotation" },
              { icon: "⭐", text: "10,000+ active subscribers" },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2">
                <span>{t.icon}</span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="py-14 px-6 sm:px-8">
          <div className="max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div>
                <div className="text-[#F5B300] text-[10px] font-mono tracking-[0.4em] uppercase mb-3">Ready Series Subscription</div>
                <h2 className="font-display text-[38px] sm:text-[52px] font-extrabold text-white leading-[0.92]">
                  Your freezer,<br />always stocked<span className="text-[#F5B300]">.</span>
                </h2>
                <p className="text-white/40 text-[14px] mt-4 max-w-[480px] leading-relaxed">
                  Subscribe and save up to 59% versus individual purchases. One delivery per month — we handle the rest.
                </p>
              </div>
              {/* Term toggle */}
              <div className="shrink-0">
                <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase mb-2">Subscription term</div>
                <div className="flex border border-white/10 overflow-hidden">
                  {([3, 6] as const).map((t) => (
                    <button key={t} onClick={() => setSubTerm(t)}
                      className={`relative px-7 py-3.5 text-[12px] font-bold tracking-wide transition-all ${subTerm === t ? "bg-[#F5B300] text-[#111]" : "text-white/40 hover:text-white bg-white/3"}`}>
                      {t} months
                      {t === 6 && (
                        <span className={`absolute -top-2.5 -right-2 text-[8px] font-extrabold px-1.5 py-0.5 ${subTerm === 6 ? "bg-[#1A1A1A] text-[#F5B300]" : "bg-[#F5B300] text-[#111]"}`}>
                          BEST VALUE
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className={`text-[10px] mt-2 font-mono transition-colors ${subTerm === 6 ? "text-[#F5B300]" : "text-white/25"}`}>
                  {subTerm === 6 ? "↑ Extra 5% off vs 3-month plan" : "Upgrade to 6 months for extra savings"}
                </div>
              </div>
            </div>

            {/* Subscription type filter — 3-way toggle */}
            <div className="flex items-center gap-4 mb-8 flex-wrap">
              <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase shrink-0">Category</div>
              <div className="flex border border-white/15 overflow-hidden">
                {([
                  { key: "meals"   as const, label: "Meals",        sub: "Low Carb & High Carb" },
                  { key: "protein" as const, label: "Just Protein",  sub: "High-protein, minimal carbs" },
                  { key: "mixed"   as const, label: "Mixed",         sub: "Carbs + Protein combo" },
                ]).map(({ key, label, sub }) => (
                  <button key={key} onClick={() => setSubTypeFilter(key)}
                    title={sub}
                    className={`px-5 py-2.5 text-[11px] font-bold tracking-wide transition-all border-r border-white/8 last:border-r-0
                      ${subTypeFilter === key ? "bg-[#F5B300] text-[#111]" : "text-white/40 hover:text-white bg-white/3 hover:bg-white/8"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {rsSignedIn && (
                <div className="ml-auto flex items-center gap-2 text-[11px] text-[#34D399] font-mono">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                  Signed in
                </div>
              )}
            </div>

            {/* Auth notice for subscription (account-gated) */}
            {!rsSignedIn && (
              <div className="flex items-center gap-4 mb-6 bg-white/4 border border-white/10 px-5 py-3.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5B300" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <div className="flex-1">
                  <span className="text-[12px] text-white/60">Subscriptions require an account. </span>
                  <span className="text-[12px] text-white/30">Sign in or create one when you subscribe — takes 30 seconds.</span>
                </div>
              </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {SUBSCRIPTION_PRODUCTS.filter((sub) => {
                if (subTypeFilter === "protein") return sub.sku.startsWith("JP");
                if (subTypeFilter === "mixed")   return sub.sku.includes("MIX");
                return !sub.sku.startsWith("JP") && !sub.sku.includes("MIX");
              }).map((sub) => {
                const details = SUB_MEAL_DETAILS[sub.sku];
                const price = subTerm === 3 ? sub.price3m : sub.price6m;
                const pricePerMeal = price / (sub.items * subTerm);
                const savingsPct = details ? Math.round((details.alaCarteAvg - pricePerMeal) / details.alaCarteAvg * 100) : 0;
                const isSelected = selectedSub === sub.sku;
                const uniqueMealIds = details ? [...new Set(details.meals.map((m) => m.id))] : [];
                const previewMeals = uniqueMealIds.slice(0, 3).map((id) => MEALS.find((m) => m.id === id)).filter(Boolean) as typeof MEALS;
                const accentColor = details?.accentColor ?? "#F5B300";
                const subMealNames = details
                  ? Array.from({ length: subTerm }).flatMap(() =>
                      details.meals.flatMap(({ id, qty }) => {
                        const meal = MEALS.find((m) => m.id === id);
                        return meal ? Array(qty).fill(meal.name) : [];
                      })
                    )
                  : [];
                const subMealImgs = details
                  ? Array.from({ length: subTerm }).flatMap(() =>
                      details.meals.flatMap(({ id, qty }) => {
                        const meal = MEALS.find((m) => m.id === id);
                        return meal ? Array(qty).fill(meal.img) : [];
                      })
                    )
                  : [];

                return (
                  <div key={sub.sku}
                    className={`flex flex-col border transition-all duration-300 relative overflow-hidden bg-[#111] ${
                      isSelected
                        ? "border-[#F5B300]"
                        : sub.badge
                          ? "border-[#F5B300]/30 hover:border-[#F5B300]/70"
                          : "border-white/8 hover:border-white/20"
                    }`}
                    style={isSelected ? { boxShadow: `0 0 0 1px ${accentColor}, 0 8px 32px rgba(0,0,0,0.5)` } : {}}>

                    {/* Badge */}
                    {sub.badge && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="bg-[#F5B300] text-[#111] text-[8px] font-extrabold tracking-[0.2em] uppercase px-2 py-1 block">
                          {sub.badge}
                        </span>
                      </div>
                    )}

                    {/* Category color strip */}
                    <div className="h-[3px] w-full shrink-0" style={{ background: accentColor }} />

                    {/* Meal photo strip */}
                    <div className="flex h-24 overflow-hidden bg-[#0D0D0D] shrink-0">
                      {previewMeals.map((m, pi) => (
                        <div key={pi} className="flex-1 overflow-hidden relative">
                          <img
                            src={`${m.img.split("?")[0]}?w=200&h=150&fit=crop&auto=format&q=75`}
                            alt={m.name}
                            className="w-full h-full object-cover opacity-75"
                          />
                          {pi < previewMeals.length - 1 && (
                            <div className="absolute right-0 top-0 bottom-0 w-px bg-[#0D0D0D]/60" />
                          )}
                        </div>
                      ))}
                      {uniqueMealIds.length > 3 && (
                        <div className="w-11 shrink-0 bg-[#1A1A1A] flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white/35">+{uniqueMealIds.length - 3}</span>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      {/* Name + variant */}
                      <div>
                        <div className="text-[13px] font-extrabold text-white leading-snug pr-12">{sub.name}</div>
                        <div className="text-[9px] font-mono tracking-[0.2em] uppercase mt-1" style={{ color: accentColor }}>
                          {sub.variant} · {sub.items} meals/month
                        </div>
                      </div>

                      {/* Per-meal price — hero number */}
                      <div className="flex items-end gap-2 mt-1">
                        <div className="font-display text-[38px] font-extrabold leading-none text-white">
                          ${pricePerMeal.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-white/30 pb-1.5 font-mono leading-none">per<br />meal</div>
                        {savingsPct > 0 && (
                          <div className="ml-auto shrink-0 px-2 py-1 text-[9px] font-extrabold tracking-[0.1em]"
                            style={{ backgroundColor: `${accentColor}1A`, color: accentColor, border: `1px solid ${accentColor}44` }}>
                            {savingsPct}% OFF
                          </div>
                        )}
                      </div>

                      {/* Meals in box — always visible */}
                      {details && (
                        <div className="border-t border-white/8 pt-3 flex flex-col gap-1.5">
                          <div className="text-[9px] font-mono tracking-[0.25em] uppercase mb-1" style={{ color: accentColor }}>
                            Monthly box · {sub.items} meals
                          </div>
                          {details.meals.map(({ id, qty }) => {
                            const meal = MEALS.find((m) => m.id === id);
                            if (!meal) return null;
                            return (
                              <div key={id} className="flex items-center gap-2 text-[11px]">
                                <div className="w-1 h-1 shrink-0 rounded-full" style={{ background: accentColor }} />
                                <span className="text-white/60 flex-1 leading-snug">{meal.name}</span>
                                <span className="font-mono text-white/30 shrink-0 text-[10px]">×{qty}</span>
                              </div>
                            );
                          })}
                          <div className="mt-1.5 pt-2 border-t border-white/8 flex flex-col gap-1">
                            {details.highlights.map((h) => (
                              <div key={h} className="flex items-center gap-1.5 text-[10px] text-white/35">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                                {h}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pricing breakdown */}
                      <div className="mt-auto pt-3 border-t border-white/8">
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-white/35">{subTerm} monthly deliveries</span>
                          <span className="text-white/35">${(price / subTerm).toFixed(2)}/delivery</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[22px] font-display font-extrabold text-white">${price.toFixed(2)}</span>
                          <span className="text-[10px] text-white/25 font-mono">total · {subTerm}mo</span>
                        </div>
                      </div>

                      {/* CTA */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!rsSignedIn) {
                            setPendingSubSku(sub.sku);
                            setShowRsAuthGate(true);
                            return;
                          }
                          setSelectedSub(sub.sku);
                          addToCart({
                            id: sub.sku.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
                            name: `${sub.name} (${sub.variant}) — ${subTerm}-Month Subscription`,
                            price,
                            qty: 1,
                            img: previewMeals[0]?.img ?? "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&h=200&fit=crop&auto=format",
                            type: "box",
                            mealNames: subMealNames,
                            mealImgs: subMealImgs,
                          });
                        }}
                        className="w-full py-3.5 text-[11px] font-extrabold tracking-[0.2em] uppercase transition-all duration-200 hover:opacity-90"
                        style={{
                          backgroundColor: isSelected ? accentColor : "transparent",
                          color: isSelected ? "#111" : accentColor,
                          border: `1px solid ${accentColor}`,
                        }}
                      >
                        {isSelected ? "✓ Added to cart" : rsSignedIn ? "Subscribe →" : "Sign In & Subscribe →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reassurance */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5">
              {[
                {
                  icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
                  title: "Free delivery, every time",
                  desc: "All subscription orders ship free — no minimum, no exceptions. Delivery dates confirmed after sign-up.",
                },
                {
                  icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
                  title: "Pause or cancel anytime",
                  desc: "Life happens. Pause, skip, or cancel your subscription from your account — no hoops, no fees.",
                },
                {
                  icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>),
                  title: "Monthly meal rotation",
                  desc: "Meals refresh every month to keep variety high. You get the best of the season, automatically.",
                },
              ].map((r, i) => (
                <div key={i} className="bg-[#111] px-7 py-8 flex gap-5">
                  <div className="text-[#F5B300] shrink-0 mt-0.5">{r.icon}</div>
                  <div>
                    <div className="font-bold text-white text-[14px] mb-1.5">{r.title}</div>
                    <div className="text-white/35 text-[12px] leading-relaxed">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-[10px] text-white/20 leading-relaxed font-mono">
              Subscription delivers once per month over your selected term and renews automatically. Pricing locked for the term. Cancel or pause anytime from your account dashboard.
            </div>
          </div>
        </section>

        {/* ── RS Auth Gate Modal ── */}
        {showRsAuthGate && (
          <div className="fixed inset-0 bg-black/85 z-[500] flex items-center justify-center p-6" onClick={() => setShowRsAuthGate(false)}>
            <div className="bg-[#0D0D0D] border border-white/12 max-w-[440px] w-full p-8" onClick={(e) => e.stopPropagation()}>
              <div className="text-[#F5B300] text-[9px] font-mono tracking-[0.4em] uppercase mb-4">Account Required</div>
              <h3 className="font-display text-[26px] font-extrabold text-white leading-tight mb-2">
                Subscribe with<br />confidence.
              </h3>
              <p className="text-white/40 text-[13px] mb-7 leading-relaxed">
                Ready Series subscriptions are managed through your account — pause, skip deliveries, or cancel anytime. No guest checkout for subscriptions.
              </p>
              <div className="space-y-3 mb-5">
                <button
                  onClick={() => {
                    setRsSignedIn(true);
                    setShowRsAuthGate(false);
                    // Auto-add the pending subscription
                    if (pendingSubSku) {
                      const sub = SUBSCRIPTION_PRODUCTS.find((s) => s.sku === pendingSubSku);
                      const details = SUB_MEAL_DETAILS[pendingSubSku];
                      if (sub && details) {
                        const price = subTerm === 3 ? sub.price3m : sub.price6m;
                        const uniqueIds = [...new Set(details.meals.map((m) => m.id))];
                        const firstMeal = MEALS.find((m) => m.id === uniqueIds[0]);
                        const subMealNames = Array.from({ length: subTerm }).flatMap(() =>
                          details.meals.flatMap(({ id, qty }) => {
                            const meal = MEALS.find((m) => m.id === id);
                            return meal ? Array(qty).fill(meal.name) : [];
                          })
                        );
                        const subMealImgs = Array.from({ length: subTerm }).flatMap(() =>
                          details.meals.flatMap(({ id, qty }) => {
                            const meal = MEALS.find((m) => m.id === id);
                            return meal ? Array(qty).fill(meal.img) : [];
                          })
                        );
                        setSelectedSub(pendingSubSku);
                        addToCart({
                          id: pendingSubSku.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
                          name: `${sub.name} (${sub.variant}) — ${subTerm}-Month Subscription`,
                          price,
                          qty: 1,
                          img: firstMeal?.img ?? "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&h=200&fit=crop&auto=format",
                          type: "box",
                          mealNames: subMealNames,
                          mealImgs: subMealImgs,
                        });
                      }
                      setPendingSubSku(null);
                    }
                  }}
                  className="w-full bg-[#F5B300] text-[#111] py-4 font-extrabold text-[13px] tracking-[0.15em] uppercase hover:bg-white transition-colors">
                  Sign In & Subscribe
                </button>
                <button
                  onClick={() => {
                    setRsSignedIn(true);
                    setShowRsAuthGate(false);
                    setPendingSubSku(null);
                  }}
                  className="w-full border border-white/20 text-white py-4 font-bold text-[13px] tracking-wide hover:border-[#F5B300] hover:text-[#F5B300] transition-colors">
                  Create Account
                </button>
              </div>
              <button onClick={() => { setShowRsAuthGate(false); setPendingSubSku(null); }}
                className="w-full text-center text-[12px] text-white/25 hover:text-white/50 transition-colors">
                Cancel
              </button>
              <p className="text-white/15 text-[9px] font-mono mt-5 text-center uppercase tracking-widest">
                Guest checkout not available for subscriptions
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── PRODUCT GRID (single purchase) ── */}
      {purchaseMode === "single" && (
      <section className={`py-16 px-6 sm:px-8 ${th("bg-[#1A1A1A]", "bg-[#FAF8F4]", "bg-[#1C1108]")}`}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
              <div className="text-[10px] font-mono tracking-[0.3em] uppercase mb-2 text-[#F5B300]">All Meals</div>
              <h2 className={`font-display text-[32px] sm:text-[40px] font-extrabold ${th("text-white", "text-[#1A1A1A]", "text-[#F5EDD8]")}`}>
                {filtered.length} meals available<span className="text-[#F5B300]">.</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`px-4 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors ${activeCat === c ? "bg-[#F5B300] text-[#111]" : th("border border-white/15 text-white/50 hover:border-[#F5B300]/50 hover:text-[#F5B300]", "border border-black/15 text-[#555] hover:border-[#F5B300] hover:text-[#C8860A]", "border border-[#F5EDD8]/15 text-[#F5EDD8]/50 hover:border-[#F5B300]/50 hover:text-[#F5B300]")}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px ${th("bg-white/8", "bg-[#E8E2D9]", "bg-[#F5EDD8]/8")}`}>
            {filtered.map((meal) => {
              const inCart = cart.find((i) => i.id === meal.id && i.type === "ready");
              const justAdded = addedId === meal.id;
              const mealReviews = MEAL_REVIEWS[meal.id];
              const avgRating = mealReviews
                ? (mealReviews.reduce((s, r) => s + r.rating, 0) / mealReviews.length).toFixed(1)
                : "4.8";
              const reviewCount = mealReviews?.length ?? 0;
              return (
                <div key={meal.id} className={`flex flex-col ${th("bg-[#111]", "bg-white", "bg-[#2A1C0D]")}`}>
                  <button
                    onClick={() => onSelectMeal(meal.id)}
                    className="relative aspect-[4/3] overflow-hidden bg-[#1A1A1A] block w-full group"
                    aria-label={`View ${meal.name} details`}
                  >
                    <img src={meal.img} alt={meal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#F5B300] text-[#1A1A1A] text-[10px] font-extrabold tracking-[0.2em] uppercase px-4 py-2">VIEW DETAILS →</span>
                    </div>
                    {meal.badge && (
                      <div className="absolute top-3 left-3 bg-[#F5B300] text-[#111] text-[8px] font-extrabold tracking-[0.15em] px-2 py-1">
                        {meal.badge}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-[#111]/80 text-white/60 text-[10px] font-mono px-2 py-1">
                      {meal.cat}
                    </div>
                  </button>
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <button onClick={() => onSelectMeal(meal.id)} className={`font-display text-[15px] font-bold leading-snug text-left hover:text-[#F5B300] transition-colors ${th("text-white", "text-[#1A1A1A]", "text-[#F5EDD8]")}`}>{meal.name}</button>
                    <div className={`flex gap-3 text-[10px] font-mono ${th("text-white/40", "text-[#888]", "text-[#F5EDD8]/45")}`}>
                      <span>{meal.protein}g protein</span>
                      <span>·</span>
                      <span>{meal.cal} cal</span>
                    </div>
                    <button
                      onClick={() => mealReviews && setReviewMealId(meal.id)}
                      className={`flex items-center gap-1.5 text-left ${mealReviews ? "hover:opacity-80" : "cursor-default"} transition-opacity`}
                    >
                      <div className="flex">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className={`text-[11px] ${s <= Math.round(Number(avgRating)) ? "text-[#F5B300]" : th("text-white/20", "text-black/15", "text-[#F5EDD8]/20")}`}>★</span>
                        ))}
                      </div>
                      <span className={`text-[11px] font-mono ${th("text-white/40", "text-[#888]", "text-[#F5EDD8]/45")}`}>{avgRating}</span>
                      {reviewCount > 0 && <span className={`text-[10px] ${th("text-white/30", "text-[#aaa]", "text-[#F5EDD8]/30")}`}>({reviewCount} reviews)</span>}
                    </button>
                    <div className={`mt-auto flex items-center justify-between gap-2 pt-3 border-t ${th("border-white/8", "border-[#E8E2D9]", "border-[#F5EDD8]/10")}`}>
                      <span className={`font-display text-[18px] font-extrabold ${th("text-white", "text-[#1A1A1A]", "text-[#F5EDD8]")}`}>${meal.price.toFixed(2)}</span>
                      <button
                        onClick={() => handleAdd(meal)}
                        className={`px-4 py-2 text-[10px] font-extrabold tracking-[0.15em] uppercase transition-colors ${justAdded ? th("bg-white text-[#1A1A1A]", "bg-[#1A1A1A] text-white", "bg-[#F5EDD8] text-[#1C1108]") : inCart ? "bg-[#F5B300]/20 text-[#F5B300] border border-[#F5B300]/30 hover:bg-[#F5B300] hover:text-[#111]" : th("bg-[#F5B300] text-[#111] hover:bg-white", "bg-[#F5B300] text-[#111] hover:bg-[#1A1A1A] hover:text-white", "bg-[#F5B300] text-[#1C1108] hover:bg-[#F5EDD8]")}`}
                      >
                        {justAdded ? "✓ Added" : inCart ? `In Cart (${inCart.qty})` : "+ Add"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ── WHY READY SERIES ── */}
      <section className="py-16 bg-[#1A1A1A] px-6 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[#F5B300] text-[10px] font-mono tracking-[0.3em] uppercase mb-3">Why Ready Series</div>
            <h2 className="font-display text-[36px] sm:text-[48px] font-extrabold">
              A busy day does not have<br />to knock you off track<span className="text-[#F5B300]">.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/8">
            {[
              { icon: "🧊", label: "Frozen at peak", desc: "Locked in at maximum freshness and nutrition." },
              { icon: "⏱", label: "3-minute prep", desc: "Microwave from frozen. No thaw time needed." },
              { icon: "📊", label: "Macro tracked", desc: "Every gram counted. No guesswork required." },
              { icon: "🚚", label: "Free delivery $120+", desc: "Free delivery on orders $120 and above. $10 below." },
            ].map((f) => (
              <div key={f.label} className="bg-[#1A1A1A] px-7 py-8">
                <div className="text-[30px] mb-4">{f.icon}</div>
                <div className="font-display text-[18px] font-bold text-white mb-2">{f.label}</div>
                <div className="text-white/40 text-[12px] leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CART STICKY BAR ── */}
      {cartQty > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F5B300] text-[#111]">
          {/* Free delivery progress — single/bundle only */}
          {toFreeDelivery > 0 && purchaseMode !== "subscription" && (
            <div className="bg-[#111] px-6 py-2 flex items-center gap-4">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#F5B300] rounded-full transition-all" style={{ width: `${freeDeliveryPct}%` }} />
              </div>
              <span className="text-[11px] text-white/60 shrink-0">Add ${toFreeDelivery.toFixed(2)} for free delivery</span>
            </div>
          )}
          <button
            className="w-full px-6 py-4 flex items-center justify-between hover:brightness-95 transition-all cursor-pointer"
            onClick={() => setCartOpen(true)}
          >
            <div className="text-left">
              <div className="font-extrabold text-[16px]">{cartQty} item{cartQty !== 1 ? "s" : ""} · ${cartTotal.toFixed(2)}</div>
              <div className="text-[11px] opacity-60">
                {purchaseMode === "subscription" ? "Delivery arranged after confirmation" : toFreeDelivery <= 0 ? "🎉 Free delivery" : `+ $${DELIVERY_FEE} delivery · Add $${toFreeDelivery.toFixed(2)} for free`}
              </div>
            </div>
            <div className="bg-[#111] text-white text-[11px] font-extrabold tracking-[0.2em] uppercase px-8 py-3">
              View Cart →
            </div>
          </button>
        </div>
      )}

      {/* ── MEAL REVIEWS MODAL ── */}
      {reviewMealId !== null && (() => {
        const meal = MEALS.find((m) => m.id === reviewMealId)!;
        const reviews = MEAL_REVIEWS[reviewMealId] ?? [];
        const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
        const starCounts = [5,4,3,2,1].map((s) => ({ star: s, count: reviews.filter((r) => r.rating === s).length }));
        return (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/75" onClick={() => setReviewMealId(null)} />
            <div className="relative bg-[#1A1A1A] w-full sm:max-w-lg max-h-[85vh] overflow-y-auto border border-white/10">
              <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/8 px-6 py-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-[15px] text-white leading-snug">{meal.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`text-[13px] ${s <= Math.round(avgRating) ? "text-[#F5B300]" : "text-white/20"}`}>★</span>
                      ))}
                    </div>
                    <span className="text-white/60 text-[12px] font-mono">{avgRating.toFixed(1)} · {reviews.length} reviews</span>
                  </div>
                </div>
                <button onClick={() => setReviewMealId(null)} className="text-white/40 hover:text-white transition-colors mt-0.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Star breakdown */}
              <div className="px-6 py-4 border-b border-white/8">
                <div className="flex flex-col gap-2">
                  {starCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-3 text-[12px]">
                      <span className="text-white/50 w-4 text-right">{star}★</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F5B300] rounded-full" style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : "0%" }} />
                      </div>
                      <span className="text-white/30 w-4">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual reviews */}
              <div className="px-6 py-4 flex flex-col gap-5">
                {reviews.map((r, i) => (
                  <div key={i} className="border-b border-white/5 pb-5 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-[13px] text-white">{r.author}</span>
                        <div className="flex mt-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={`text-[11px] ${s <= r.rating ? "text-[#F5B300]" : "text-white/20"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[11px] text-white/30 font-mono">{r.date}</span>
                    </div>
                    <p className="text-[13px] text-white/60 leading-relaxed">{r.text}</p>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-white/40 text-[13px] text-center py-4">No reviews yet for this meal. Be the first!</p>
                )}
              </div>

              <div className="px-6 pb-6">
                <button onClick={() => { setReviewMealId(null); handleAdd(meal); }}
                  className="w-full bg-[#F5B300] text-[#111] py-3.5 font-bold text-[13px] tracking-wider uppercase hover:bg-white transition-colors">
                  Add to Cart — ${meal.price.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
