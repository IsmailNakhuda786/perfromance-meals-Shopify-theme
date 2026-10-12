import { useState } from "react";
import { MEALS as DATA_MEALS, CartItem, Page, ALL_REVIEWS } from "@/data";
import { ReadySeriesLogo } from "@/components/Logos";

// Local Ready-Series meals (as shown in ReadySeriesPage grid)
const RS_MEALS = [
  { id: 101, name: "Teriyaki Chicken & Brown Rice", cat: "High Protein", price: 12.90, protein: 42, carbs: 48, fat: 8, cal: 478, badge: "BESTSELLER", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80", rating: 4.9, reviews: 284, desc: "Grilled teriyaki chicken glazed with our house-made sauce, served over nutty brown rice with edamame and pickled ginger. A crowd favourite built for high-protein days." },
  { id: 102, name: "Spicy Korean Beef Bulgogi", cat: "Low Carb", price: 13.50, protein: 38, carbs: 12, fat: 14, cal: 326, badge: "HOT", img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80", rating: 4.8, reviews: 201, desc: "Grass-fed beef marinated in gochujang and sesame, served low-carb with shredded cabbage and crispy scallion. Genuinely spicy — as advertised." },
  { id: 103, name: "Herb Chicken & Roasted Veg", cat: "Low Carb", price: 12.50, protein: 36, carbs: 14, fat: 10, cal: 290, badge: null, img: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&q=80", rating: 4.7, reviews: 156, desc: "Free-range chicken breast seasoned in rosemary, thyme, and lemon zest. Paired with oven-roasted courgette, capsicum, and broccolini." },
  { id: 104, name: "Salmon & Quinoa Power Bowl", cat: "High Protein", price: 15.90, protein: 44, carbs: 38, fat: 16, cal: 468, badge: "NEW", img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", rating: 4.9, reviews: 98, desc: "Atlantic salmon fillet over protein-rich tricolour quinoa with spinach, cucumber, and a lemon-tahini dressing. Premium and nutritionally complete." },
  { id: 105, name: "Thai Basil Pork Rice Bowl", cat: "High Carb", price: 11.90, protein: 28, carbs: 62, fat: 8, cal: 436, badge: null, img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80", rating: 4.7, reviews: 174, desc: "Wok-fried minced pork with Thai basil, oyster sauce, and bird's eye chilli over steamed jasmine rice. Fast, bold, and carb-fuelled." },
  { id: 106, name: "Miso Glazed Salmon", cat: "High Protein", price: 16.90, protein: 46, carbs: 18, fat: 18, cal: 414, badge: "PREMIUM", img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80", rating: 4.9, reviews: 142, desc: "Premium Atlantic salmon fillet in a house-made white miso glaze, served with steamed bok choy and sesame soba. The flagship premium option." },
  { id: 107, name: "Overnight Oats & Berry", cat: "Breakfast", price: 8.90, protein: 18, carbs: 52, fat: 6, cal: 334, badge: null, img: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&q=80", rating: 4.7, reviews: 119, desc: "Rolled oats soaked overnight with chia seeds, protein powder, and oat milk. Topped with a mixed berry compote. Ready cold or warm." },
  { id: 108, name: "Greek Chicken Wrap", cat: "High Protein", price: 12.90, protein: 34, carbs: 36, fat: 10, cal: 374, badge: null, img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80", rating: 4.8, reviews: 87, desc: "Grilled lemon-oregano chicken with tzatziki, tomato, red onion, and rocket in a wholemeal wrap. Light, fresh, and high protein." },
  { id: 109, name: "Egg White & Avocado Toast", cat: "Breakfast", price: 9.50, protein: 22, carbs: 34, fat: 12, cal: 332, badge: "POPULAR", img: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80", rating: 4.8, reviews: 203, desc: "Thick-cut sourdough topped with smashed avocado, seasoned egg white omelette, and chilli flakes. Cafe quality at home — in under 3 minutes." },
  { id: 110, name: "Beef Rendang & Cauliflower", cat: "Low Carb", price: 14.90, protein: 40, carbs: 10, fat: 22, cal: 398, badge: null, img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80", rating: 4.8, reviews: 134, desc: "Slow-braised beef in rich rendang spice paste — lemongrass, galangal, coconut. Served over cauliflower rice for a deeply satisfying low-carb meal." },
  { id: 111, name: "Chicken Burrito Bowl", cat: "High Carb", price: 12.50, protein: 30, carbs: 58, fat: 10, cal: 450, badge: null, img: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80", rating: 4.7, reviews: 92, desc: "Chipotle-marinated chicken over Mexican rice with black beans, corn salsa, guacamole, and sour cream. Big flavour, big carbs." },
  { id: 112, name: "Prawn Fried Rice", cat: "High Carb", price: 13.90, protein: 26, carbs: 60, fat: 8, cal: 428, badge: "BESTSELLER", img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80", rating: 4.9, reviews: 267, desc: "Wok-tossed jasmine rice with tiger prawns, egg, spring onion, and light soy. Clean, familiar, and genuinely satisfying — a week-day staple." },
];

// Merge both meal sources for unified lookup
const ALL_MEALS = [...DATA_MEALS, ...RS_MEALS];

interface Props {
  mealId: number;
  navigate: (page: Page) => void;
  addToCart: (item: CartItem) => void;
}

// Prep and storage info per meal
const PREP_INFO = [
  { icon: "⏱", label: "Prep time", value: "3 minutes" },
  { icon: "🧊", label: "Frozen at peak", value: "Locked in fresh" },
  { icon: "📦", label: "Storage", value: "Freezer up to 3 months" },
  { icon: "🔥", label: "Heat method", value: "Microwave or pan" },
];

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-[14px] ${i < Math.round(rating) ? "text-[#F5B300]" : "text-white/15"}`}>★</span>
      ))}
    </div>
  );
}

export default function ReadySeriesProductPage({ mealId, navigate, addToCart }: Props) {
  const meal = ALL_MEALS.find((m) => m.id === mealId);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "nutrition" | "reviews">("overview");

  if (!meal) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">Meal not found.</p>
          <button onClick={() => navigate("ready-series")} className="bg-[#F5B300] text-[#1A1A1A] px-6 py-3 font-bold text-[12px] tracking-widest uppercase">
            Back to Ready-Series
          </button>
        </div>
      </div>
    );
  }

  const reviews = ALL_REVIEWS[meal.id] ?? [];
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : meal.rating;
  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
    pct: reviews.length > 0 ? (reviews.filter((r) => r.rating === s).length / reviews.length) * 100 : 0,
  }));

  const handleAddToCart = () => {
    addToCart({ id: meal.id, name: meal.name, price: meal.price, qty, img: meal.img, type: "ready" });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Related meals (same category, excluding this one — from same pool)
  const pool = mealId >= 100 ? RS_MEALS : DATA_MEALS;
  const related = pool.filter((m) => m.cat === meal.cat && m.id !== meal.id).slice(0, 3);

  return (
    <div className="bg-[#1A1A1A] text-white min-h-screen">

      {/* ── BREADCRUMB ── */}
      <div className="border-b border-white/8 px-6 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center gap-2 text-[11px] font-mono text-white/30">
          <button onClick={() => navigate("home")} className="hover:text-white transition-colors">Performance Meals</button>
          <span>/</span>
          <button onClick={() => navigate("ready-series")} className="hover:text-white transition-colors">Ready-Series</button>
          <span>/</span>
          <span className="text-white/60 truncate max-w-[200px]">{meal.name}</span>
        </div>
      </div>

      {/* ── HERO SPLIT: image left, detail right ── */}
      <div className="max-w-[1200px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

        {/* Left — image */}
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden bg-[#111]">
            <img src={meal.img} alt={meal.name} className="w-full h-full object-cover" />
          </div>
          {meal.badge && (
            <div className="absolute top-4 left-4 bg-[#F5B300] text-[#1A1A1A] text-[9px] font-extrabold tracking-[0.2em] uppercase px-3 py-1.5">
              {meal.badge}
            </div>
          )}
          <div className="absolute top-4 right-4 bg-[#111]/80 text-white/50 text-[10px] font-mono uppercase px-2 py-1 tracking-wider">
            {meal.cat.replace("-", " ")}
          </div>

          {/* Prep quick-facts below image */}
          <div className="grid grid-cols-2 gap-px mt-px bg-white/8">
            {PREP_INFO.map((p) => (
              <div key={p.label} className="bg-[#111] px-4 py-3 flex items-center gap-3">
                <span className="text-[18px]">{p.icon}</span>
                <div>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/30">{p.label}</div>
                  <div className="text-[12px] font-semibold text-white mt-0.5">{p.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product detail */}
        <div className="flex flex-col gap-6">
          <div className="mb-1">
            <ReadySeriesLogo size="sm" variant="dark" />
          </div>

          <div>
            <h1 className="font-display text-[32px] sm:text-[40px] font-extrabold uppercase leading-tight text-white mb-3">
              {meal.name.toUpperCase()}
            </h1>

            {/* Rating summary */}
            <div className="flex items-center gap-3 mb-4">
              <StarRow rating={avgRating} />
              <span className="text-[#F5B300] font-mono text-[13px] font-bold">{avgRating.toFixed(1)}</span>
              <span className="text-white/30 text-[12px]">·</span>
              <button
                onClick={() => setActiveTab("reviews")}
                className="text-[12px] text-white/40 hover:text-[#F5B300] transition-colors underline underline-offset-2"
              >
                {reviews.length > 0 ? `${reviews.length} verified reviews` : `${meal.reviews} reviews`}
              </button>
            </div>

            <p className="text-white/50 text-[15px] leading-relaxed mb-5">{meal.desc}</p>

            {/* Macros */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/8 mb-6">
              {[
                { val: `${meal.protein}g`, label: "Protein" },
                { val: `${meal.carbs}g`, label: "Carbs" },
                { val: `${meal.fat}g`, label: "Fat" },
                { val: `${meal.cal}`, label: "Calories" },
              ].map((m) => (
                <div key={m.label} className="bg-[#111] py-4 flex flex-col items-center gap-1">
                  <div className="font-display text-[20px] font-extrabold text-[#F5B300]">{m.val}</div>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/30">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Price + qty + CTA */}
          <div className="border-t border-white/8 pt-6">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-display text-[36px] font-extrabold text-white">${meal.price.toFixed(2)}</span>
              <span className="text-white/30 text-[13px]">per meal</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-white/15">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors text-[18px]"
                >−</button>
                <span className="w-10 text-center font-mono text-[14px] font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors text-[18px]"
                >+</button>
              </div>
              <span className="text-white/30 text-[12px] font-mono">Total: ${(meal.price * qty).toFixed(2)}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-4 font-extrabold text-[12px] tracking-[0.2em] uppercase transition-colors ${added ? "bg-white text-[#1A1A1A]" : "bg-[#F5B300] text-[#1A1A1A] hover:bg-white"}`}
              >
                {added ? "✓ ADDED TO CART" : "ADD TO CART"}
              </button>
              <button
                onClick={() => navigate("ready-series")}
                className="px-6 py-4 border border-white/15 text-white/50 hover:border-white/40 hover:text-white transition-colors text-[11px] font-bold tracking-[0.15em] uppercase"
              >
                KEEP SHOPPING
              </button>
            </div>

            <p className="text-white/25 text-[11px] mt-3 font-mono">
              🧊 Frozen at peak · ⚡ Next-day island-wide delivery · 📦 Free delivery over $80
            </p>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="border-t border-white/8 sticky top-[56px] z-10 bg-[#1A1A1A]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex gap-0">
            {(["overview", "nutrition", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-[11px] font-bold tracking-[0.2em] uppercase border-b-2 transition-colors ${activeTab === tab ? "border-[#F5B300] text-[#F5B300]" : "border-transparent text-white/30 hover:text-white"}`}
              >
                {tab}{tab === "reviews" && reviews.length > 0 ? ` (${reviews.length})` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="max-w-[1200px] mx-auto px-6 py-12">

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="text-[10px] font-mono tracking-[0.35em] uppercase text-[#F5B300] mb-3">About this meal</div>
              <h2 className="font-display text-[22px] font-extrabold uppercase mb-4">WHAT MAKES IT GOOD</h2>
              <p className="text-white/50 text-[15px] leading-relaxed mb-6">{meal.desc}</p>
              <ul className="space-y-3">
                {[
                  "Frozen at peak freshness — not reheated from fresh",
                  "Chef-prepared in our in-house kitchen",
                  "Macros verified by registered nutritionists",
                  "No artificial preservatives or flavour enhancers",
                  "Ready in under 3 minutes — no prep, no waste",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[13px] text-white/50">
                    <span className="text-[#F5B300] mt-0.5 shrink-0">—</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-[0.35em] uppercase text-[#F5B300] mb-3">How to prepare</div>
              <h2 className="font-display text-[22px] font-extrabold uppercase mb-6">READY IN 3 MINUTES</h2>
              <div className="space-y-4">
                {[
                  { n: "01", t: "Remove from freezer", d: "Take from freezer and remove the lid or pierce the film." },
                  { n: "02", t: "Microwave", d: "Heat on full power for 2.5–3 minutes. Or pan-heat with a splash of water for 4 minutes." },
                  { n: "03", t: "Rest briefly", d: "Let stand for 30 seconds before eating for even temperature throughout." },
                  { n: "04", t: "Enjoy", d: "No washing up. No dishes. Just fuel that works." },
                ].map((step) => (
                  <div key={step.n} className="flex gap-4">
                    <div className="font-display text-[#F5B300] text-[22px] font-extrabold w-10 shrink-0">{step.n}</div>
                    <div>
                      <div className="font-semibold text-[14px] text-white mb-0.5">{step.t}</div>
                      <div className="text-[13px] text-white/40 leading-relaxed">{step.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nutrition */}
        {activeTab === "nutrition" && (
          <div className="max-w-[520px]">
            <div className="text-[10px] font-mono tracking-[0.35em] uppercase text-[#F5B300] mb-3">Per serving</div>
            <h2 className="font-display text-[22px] font-extrabold uppercase mb-6">NUTRITION FACTS</h2>
            <div className="border border-white/10">
              {[
                { label: "Energy", value: `${meal.cal} kcal`, highlight: false },
                { label: "Protein", value: `${meal.protein}g`, highlight: true },
                { label: "Total Carbohydrates", value: `${meal.carbs}g`, highlight: false },
                { label: "  — of which sugars", value: `${Math.round(meal.carbs * 0.18)}g`, highlight: false },
                { label: "Total Fat", value: `${meal.fat}g`, highlight: false },
                { label: "  — of which saturates", value: `${Math.round(meal.fat * 0.3)}g`, highlight: false },
                { label: "Dietary Fibre", value: `${Math.round(meal.carbs * 0.12)}g`, highlight: false },
                { label: "Sodium", value: `${Math.round(meal.protein * 14)}mg`, highlight: false },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between px-5 py-3 border-b border-white/6 last:border-0 ${row.highlight ? "bg-[#F5B300]/6" : ""}`}>
                  <span className={`text-[13px] ${row.highlight ? "font-bold text-[#F5B300]" : "text-white/50"}`}>{row.label}</span>
                  <span className={`font-mono text-[13px] font-bold ${row.highlight ? "text-[#F5B300]" : "text-white"}`}>{row.value}</span>
                </div>
              ))}
            </div>
            <p className="text-white/20 text-[10px] mt-3 font-mono">Values are approximate. Verified by our in-house nutritionists.</p>
          </div>
        )}

        {/* Reviews */}
        {activeTab === "reviews" && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">

              {/* Left — aggregate */}
              <div className="border border-white/10 p-8 flex flex-col items-center text-center">
                <div className="font-display text-[64px] font-extrabold text-[#F5B300] leading-none mb-2">
                  {avgRating.toFixed(1)}
                </div>
                <StarRow rating={avgRating} />
                <p className="text-white/30 text-[12px] font-mono mt-2">
                  {reviews.length > 0 ? `${reviews.length} verified reviews` : `${meal.reviews} reviews`}
                </p>

                <div className="w-full mt-6 space-y-2">
                  {starCounts.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-white/30 w-4 shrink-0">{star}</span>
                      <span className="text-[#F5B300] text-[11px]">★</span>
                      <div className="flex-1 h-1.5 bg-white/8">
                        <div className="h-full bg-[#F5B300] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-white/30 w-4 shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — review list */}
              <div className="lg:col-span-2 space-y-0">
                {reviews.length > 0 ? reviews.map((r, i) => (
                  <div key={i} className="border-b border-white/8 py-7 last:border-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 bg-[#F5B300] flex items-center justify-center font-extrabold text-[11px] text-[#1A1A1A] shrink-0">
                            {r.author.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[13px] text-white">{r.author}</div>
                            <div className="text-[11px] text-white/30">{r.role}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StarRow rating={r.rating} />
                        <div className="text-[10px] text-white/25 font-mono mt-1">{r.date}</div>
                      </div>
                    </div>
                    <p className="text-[14px] text-white/60 leading-relaxed">{r.text}</p>
                    {r.verified && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <div className="w-1.5 h-1.5 bg-[#F5B300]" />
                        <span className="text-[10px] font-mono text-white/25 tracking-wider">VERIFIED PURCHASE</span>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="py-16 text-center">
                    <p className="text-white/30 text-[14px]">No written reviews yet for this meal.</p>
                    <p className="text-white/20 text-[12px] mt-2">Be the first to leave one after your order arrives.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RELATED MEALS ── */}
      {related.length > 0 && (
        <div className="border-t border-white/8 py-14 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-[10px] font-mono tracking-[0.35em] uppercase text-[#F5B300] mb-2">More from Ready-Series</div>
            <h2 className="font-display text-[26px] font-extrabold uppercase mb-8">YOU MAY ALSO LIKE</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/8">
              {related.map((m) => {
                const relReviews = ALL_REVIEWS[m.id] ?? [];
                const relAvg = relReviews.length > 0
                  ? relReviews.reduce((s, r) => s + r.rating, 0) / relReviews.length
                  : m.rating;
                return (
                  <button
                    key={m.id}
                    onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); navigate("ready-series-product"); }}
                    className="bg-[#111] text-left group"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={m.img} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <div className="font-display text-[14px] font-extrabold uppercase text-white mb-1 leading-snug">{m.name}</div>
                      <div className="flex items-center gap-2 mb-3">
                        <StarRow rating={relAvg} />
                        <span className="text-white/30 text-[11px] font-mono">{relAvg.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[16px] font-extrabold text-white">${m.price.toFixed(2)}</span>
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#F5B300]">View →</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => navigate("ready-series")}
                className="inline-flex items-center gap-3 bg-[#F5B300] text-[#1A1A1A] px-10 py-4 font-extrabold text-[12px] tracking-[0.2em] uppercase hover:bg-white transition-colors"
              >
                SHOP ALL READY-SERIES →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
