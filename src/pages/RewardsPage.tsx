import { Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
  isLoggedIn?: boolean;
}

const TIERS = [
  { name: "Starter", pts: "0–499 pts", color: "#888", perks: ["1 pt per $1 spent", "Birthday bonus meal", "Early access to new menus"] },
  { name: "Gold", pts: "500–1,999 pts", color: "#F5B300", perks: ["1.5 pts per $1 spent", "Free delivery on all orders", "Priority customer support", "Exclusive Gold bundles"] },
  { name: "Platinum", pts: "2,000+ pts", color: "#E0E0E0", perks: ["2 pts per $1 spent", "Monthly free meal", "Dedicated account manager", "Invite-only events & tastings"] },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Order any meal", desc: "Every $1 spent earns you points. Meal Plan orders earn 1.5× points automatically." },
  { step: "02", title: "Points stack up", desc: "No expiry on points as long as you order once every 90 days. Referrals earn 200 bonus pts per friend." },
  { step: "03", title: "Redeem for credit", desc: "Choose a voucher tier: 500 pts = $5 · 1,000 pts = $11 · 2,000 pts = $25. Applied at checkout instantly." },
];

const FAQS = [
  { q: "When do I earn points?", a: "Points are credited within 24 hours of your order being delivered. Cancelled or refunded orders do not earn points." },
  { q: "Do points expire?", a: "Points remain valid as long as you place at least one order every 90 days. Your tier resets annually on your account anniversary." },
  { q: "Can I earn points on bundles?", a: "Yes — bundles earn the same points as individual meal orders. Meal Plans earn 1.5× the standard rate." },
  { q: "How do I refer a friend?", a: "Share your unique referral link from your account dashboard. You earn 200 pts when they place their first order." },
];

export default function RewardsPage({ navigate, isLoggedIn }: Props) {
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">

      {/* Hero */}
      <div className="relative overflow-hidden bg-[#111] border-b border-white/8">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(245,179,0,0.5) 40px,rgba(245,179,0,0.5) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(245,179,0,0.5) 40px,rgba(245,179,0,0.5) 41px)" }} />
        <div className="absolute right-0 top-0 w-[600px] h-[600px] bg-[#F5B300]/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
          <div className="text-[#F5B300] text-[10px] font-mono tracking-[0.4em] uppercase mb-4">Performance Meals Rewards</div>
          <h1 className="font-display text-[48px] sm:text-[72px] font-extrabold leading-none mb-4">
            Eat well.<br />
            <span className="text-[#F5B300]">Get rewarded.</span>
          </h1>
          <p className="text-white/50 text-[16px] max-w-[480px] leading-relaxed mb-8">
            Earn points on every order, unlock tiers, and redeem for wallet credit. The more you eat, the more you save.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("meal-plan-landing")}
              className="bg-[#F5B300] text-[#111] px-8 py-4 font-extrabold text-[12px] tracking-[0.25em] uppercase hover:bg-white transition-colors"
            >
              Start Earning →
            </button>
            {!isLoggedIn && (
              <button
                onClick={() => navigate("account")}
                className="border border-white/20 text-white px-8 py-4 font-bold text-[12px] tracking-[0.2em] uppercase hover:border-[#F5B300] hover:text-[#F5B300] transition-colors"
              >
                Sign In / Join
              </button>
            )}
            {isLoggedIn && (
              <button
                onClick={() => navigate("account")}
                className="border border-[#F5B300]/40 text-[#F5B300] px-8 py-4 font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-[#F5B300]/10 transition-colors"
              >
                My Points Dashboard →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[#F5B300] uppercase mb-2">How It Works</div>
        <h2 className="font-display text-[32px] font-extrabold mb-10">Three simple steps<span className="text-[#F5B300]">.</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-white/8">
          {HOW_IT_WORKS.map((h) => (
            <div key={h.step} className="p-8 border-b sm:border-b-0 sm:border-r border-white/8 last:border-0">
              <div className="font-mono text-[40px] font-extrabold text-white/8 leading-none mb-4">{h.step}</div>
              <h3 className="font-bold text-[16px] text-white mb-2">{h.title}</h3>
              <p className="text-white/40 text-[13px] leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Voucher tiers callout */}
      <section className="bg-[#111] border-y border-white/8 py-12">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-[10px] font-mono tracking-[0.3em] text-[#F5B300] uppercase mb-6 text-center">Voucher Tiers</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-white/8">
            {[
              { pts: "500 pts", credit: "$5",  bonus: null,        label: "Starter voucher" },
              { pts: "1,000 pts", credit: "$11", bonus: "10% bonus", label: "Value voucher" },
              { pts: "2,000 pts", credit: "$25", bonus: "25% bonus", label: "Premium voucher" },
            ].map((t, i) => (
              <div key={i} className="p-8 border-b sm:border-b-0 sm:border-r border-white/8 last:border-0 text-center">
                <div className="font-display text-[48px] font-extrabold text-[#F5B300] leading-none">{t.credit}</div>
                <div className="text-white/60 text-[14px] mt-1">{t.pts}</div>
                {t.bonus && <div className="text-[#F5B300] text-[11px] font-bold mt-1 tracking-wider">{t.bonus}</div>}
                <div className="text-white/25 text-[11px] font-mono mt-2 uppercase tracking-wider">{t.label}</div>
              </div>
            ))}
          </div>
          <p className="text-white/25 text-[12px] text-center mt-4">Applied instantly at checkout — no codes needed. Combine with promos for maximum savings.</p>
        </div>
      </section>

      {/* Tiers */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[#F5B300] uppercase mb-2">Membership Tiers</div>
        <h2 className="font-display text-[32px] font-extrabold mb-10">The more you order, the better it gets<span className="text-[#F5B300]">.</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((t) => (
            <div key={t.name} className="bg-[#111] border border-white/8 p-6 hover:border-[#F5B300]/30 transition-colors">
              <div className="w-10 h-1 mb-5" style={{ backgroundColor: t.color }} />
              <div className="font-display text-[22px] font-extrabold text-white mb-1">{t.name}</div>
              <div className="text-[11px] font-mono text-white/30 mb-5">{t.pts}</div>
              <ul className="flex flex-col gap-2.5">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[13px] text-white/60">
                    <span className="text-[#F5B300] mt-0.5 shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-[#111] border-t border-white/8 py-16">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="text-[10px] font-mono tracking-[0.3em] text-[#F5B300] uppercase mb-2">FAQ</div>
          <h2 className="font-display text-[32px] font-extrabold mb-10">Common questions<span className="text-[#F5B300]">.</span></h2>
          <div className="flex flex-col">
            {FAQS.map((f, i) => (
              <div key={i} className="border-b border-white/8 py-5">
                <p className="font-semibold text-[14px] text-white mb-2">{f.q}</p>
                <p className="text-white/45 text-[13px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-[1200px] mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-[36px] font-extrabold mb-4">
          Ready to start earning<span className="text-[#F5B300]">?</span>
        </h2>
        <p className="text-white/40 text-[14px] mb-8">Join thousands of members already earning rewards on every meal.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => navigate("ready-series")}
            className="bg-[#F5B300] text-[#111] px-10 py-4 font-extrabold text-[12px] tracking-[0.25em] uppercase hover:bg-white transition-colors">
            Shop Ready Series
          </button>
          <button onClick={() => navigate("meal-plan-landing")}
            className="border border-white/20 text-white px-10 py-4 font-bold text-[12px] tracking-[0.2em] uppercase hover:border-[#F5B300] hover:text-[#F5B300] transition-colors">
            Start a Meal Plan
          </button>
        </div>
      </section>
    </div>
  );
}
