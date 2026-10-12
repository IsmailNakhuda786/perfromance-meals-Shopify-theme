import { useState } from "react";
import { Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
  orderType: "ready" | "plan";
  isGuest?: boolean;
  promoCode?: string;
  promoDiscount?: number;
  orderTotal?: number;
  orderDetails?: { name: string; address: string; date: string; slot: string; deliveryFee: number } | null;
}

export default function ConfirmationPage({ navigate, orderType, isGuest = false, promoCode = "", promoDiscount = 0, orderTotal = 0, orderDetails = null }: Props) {
  const orderNum = `#PM-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const customerName = orderDetails?.name?.split(" ")[0] ?? "Jerome";
  const deliveryFee = orderDetails?.deliveryFee ?? 0;
  // orderTotal passed from CheckoutPage already includes deliveryFee and deducts promoDiscount
  const finalTotal = orderTotal;

  const [showSignup, setShowSignup] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suPassword, setSuPassword] = useState("");

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center px-6 py-12 sm:py-20">
      <div className="max-w-[600px] w-full text-center">
        {/* Hero area with decorative confetti elements */}
        <div className="relative mb-8">
          {/* Decorative confetti circles */}
          <div className="absolute -top-4 left-8 w-4 h-4 bg-[#F5B300] rounded-full opacity-40" />
          <div className="absolute top-2 right-12 w-6 h-6 bg-[#F5B300] rounded-full opacity-40" />
          <div className="absolute -top-2 right-4 w-3 h-3 bg-[#7EE8B0] opacity-40" />
          <div className="absolute top-8 left-16 w-5 h-5 bg-[#7EE8B0] rounded-full opacity-40" />
          {/* Success icon */}
          <div className="w-20 h-20 bg-[#F5B300] rounded-full flex items-center justify-center mx-auto">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>

        <div className="font-mono text-[10px] tracking-[0.45em] text-[#111]/35 uppercase mb-4">Order Confirmed</div>
        <h1 className="font-display text-[36px] sm:text-[48px] font-bold mb-2 leading-tight">
          Your order is confirmed!
        </h1>
        <p className="text-[#555] text-[18px] mb-4">{customerName}, your meals are being prepared.</p>
        <p className="text-[#666] text-[16px] leading-relaxed mb-10">
          Your order <strong className="text-[#111] font-mono">{orderNum}</strong> has been confirmed. You'll receive a confirmation email and SMS shortly.
        </p>

        {/* Order details */}
        <div className="bg-white border border-[#E5E2DA] p-6 text-left mb-6">
          <div className="font-mono text-[10px] tracking-[0.3em] text-[#999] uppercase mb-5">Order Details</div>
          <div className="space-y-4">
            {[
              { label: "Delivery Address", value: orderDetails?.address ?? "—" },
              { label: "Delivery Date", value: orderDetails?.date ?? "—" },
              { label: "Time Slot", value: orderDetails?.slot ?? "—" },
              { label: "Subtotal", value: `$${orderTotal.toFixed(2)}` },
              ...(deliveryFee > 0 ? [{ label: "Delivery Fee", value: `$${deliveryFee.toFixed(2)}` }] : [{ label: "Delivery", value: "Free" }]),
              ...(promoCode ? [{ label: `Promo (${promoCode})`, value: `–$${promoDiscount.toFixed(2)}` }] : []),
              { label: "Total Charged", value: `$${finalTotal.toFixed(2)}` },
              { label: "Payment", value: `Visa ···· 4242 · $${finalTotal.toFixed(2)}` },
            ].map((d) => (
              <div key={d.label} className={`flex items-start justify-between gap-4 ${d.label.startsWith("Promo") ? "text-green-600" : ""}`}>
                <span className={`text-[13px] shrink-0 ${d.label.startsWith("Promo") ? "font-medium" : "text-[#999]"}`}>{d.label}</span>
                <span className={`text-[13px] font-medium text-right ${d.label.startsWith("Promo") ? "" : "text-[#111]"}`}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery progress timeline — detailed */}
        <div className="bg-white border border-[#E5E2DA] p-6 mb-5 text-left">
          <div className="font-mono text-[10px] tracking-[0.3em] text-[#999] uppercase mb-5">Live Order Status</div>
          <div className="space-y-0">
            {[
              { label: "Order Confirmed", time: "Today · 9:04am", detail: `Payment processed · Order ${orderNum}`, done: true, active: false },
              { label: "Kitchen Preparing", time: "Today · 11:00am", detail: "Our chefs are preparing your meals fresh to order", done: false, active: true },
              { label: "Quality Check", time: "Today · 1:00pm", detail: "Macro verification and packaging seal check", done: false, active: false },
              { label: "Out for Delivery", time: "Today · 2:30pm", detail: "Driver assigned · ETA within your selected time window", done: false, active: false },
              { label: "Delivered", time: "Today · 5:00pm", detail: "Meals at your door — enjoy your performance fuel!", done: false, active: false },
            ].map((s, i) => (
              <div key={s.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${s.done ? "bg-[#F5B300] border-[#F5B300]" : s.active ? "bg-[#111] border-[#111]" : "bg-white border-[#D0CCC4]"}`}>
                    {s.done ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                    ) : s.active ? (
                      <div className="w-2 h-2 bg-[#F5B300] rounded-full animate-pulse" />
                    ) : null}
                  </div>
                  {i < 4 && <div className={`w-px flex-1 min-h-[32px] ${s.done ? "bg-[#F5B300]/40" : "bg-[#E5E2DA]"}`} />}
                </div>
                <div className="pb-5 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-[13px] font-semibold ${s.done || s.active ? "text-[#111]" : "text-[#aaa]"}`}>{s.label}</span>
                    <span className={`font-mono text-[11px] ${s.done ? "text-[#888]" : s.active ? "text-[#F5B300] bg-[#111] px-2 py-0.5" : "text-[#ccc]"}`}>{s.time}</span>
                  </div>
                  <p className={`text-[12px] mt-0.5 ${s.done || s.active ? "text-[#666]" : "text-[#ccc]"}`}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification channels */}
        {/* WhatsApp — always shown */}
        <div className="bg-[#075E54] text-white p-5 mb-3 text-left flex items-start sm:items-center gap-4 flex-wrap sm:flex-nowrap">
          <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.122 1.524 5.86L.057 23.998l6.294-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.625-.48-5.15-1.322l-.369-.219-3.737.98.998-3.648-.24-.378A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px]">Confirmation sent via WhatsApp</div>
            <div className="text-white/70 text-[12px] mt-0.5">Live order updates at <strong className="text-white">+65 9123 4567</strong> — reply anytime to reach us</div>
          </div>
          <div className="shrink-0 bg-[#25D366] text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1.5">
            ✓ Sent
          </div>
        </div>
        {/* Email — always shown */}
        <div className="bg-[#0E0E0E] text-white p-5 mb-5 text-left flex items-start sm:items-center gap-4 flex-wrap sm:flex-nowrap">
          <span className="text-[24px]">✉️</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[14px]">Confirmation also sent to your email</div>
            <div className="text-white/40 text-[12px] mt-0.5">Check <strong className="text-white/70">jerome@email.com</strong> for your {orderType === "plan" ? "full meal plan schedule and delivery windows" : "order receipt and delivery details"}</div>
          </div>
          <div className="shrink-0 text-[#F5B300] text-[10px] font-bold tracking-wider uppercase">
            ✓ Sent
          </div>
        </div>

        {/* Track order notice */}
        <div className="bg-[#0E0E0E] text-white p-5 mb-5 text-left flex items-start sm:items-center gap-4">
          <span className="text-[24px]">📦</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[14px]">Track your order in real time</div>
            <div className="text-white/40 text-[12px] mt-0.5">SMS updates will be sent to +65 9123 4567</div>
          </div>
        </div>

        {/* Customize Meal Plan CTA — only for plan orders */}
        {orderType === "plan" && <div className="bg-[#1A1A1A] border border-[#E85D04]/30 p-5 mb-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-[#E85D04] uppercase mb-2">Your Meal Plan is now active</div>
              <div className="font-display text-[20px] font-bold text-white mb-1">Customize your upcoming meals</div>
              <div className="text-white/40 text-[13px] leading-relaxed">
                Swap meals, change delivery days & times, adjust quantity — all from your account.
              </div>
            </div>
            <button onClick={() => navigate("account")}
              className="shrink-0 bg-[#E85D04] text-white px-5 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-white hover:text-[#1A1A1A] transition-colors whitespace-nowrap">
              Customize →
            </button>
          </div>
        </div>}

        {/* Rewards earned — members only */}
        {!isGuest ? (
          <div className="bg-[#111111] text-white p-5 mb-8 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-[#F5B300] uppercase mb-1">Points Earned</div>
              <div className="font-display text-[28px] font-bold text-[#F5B300]">+{Math.floor(orderTotal)} pts</div>
              <div className="text-white/35 text-[12px]">Added to your rewards balance</div>
            </div>
            <div className="text-right">
              <div className="text-white/35 text-[12px] mb-1">New balance</div>
              <div className="font-display text-[22px] font-bold">1,234 pts</div>
              <div className="text-white/35 text-[11px]">Worth $12.34</div>
            </div>
          </div>
        ) : (
          /* Guest — nudge to sign up */
          <div className="bg-[#111111] text-white p-5 mb-8">
            <div className="font-mono text-[10px] tracking-[0.3em] text-[#F5B300] uppercase mb-2">You left points on the table</div>
            <div className="font-display text-[22px] font-bold mb-1">This order would've earned <span className="text-[#F5B300]">+{Math.floor(orderTotal)} pts</span></div>
            <p className="text-white/50 text-[13px] mb-4">Create a free account to earn points, get exclusive discounts, and track all your orders.</p>
            <button onClick={() => setShowSignup(true)}
              className="bg-[#F5B300] text-[#111] px-6 py-3 text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-white transition-colors">
              Sign Up — It's Free →
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isGuest ? (
            <button onClick={() => navigate("account")} className="inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-8 py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-[#F5B300] hover:text-[#111111] transition-colors">
              Go to My Account →
            </button>
          ) : (
            <button onClick={() => navigate("home")} className="inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-8 py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-[#F5B300] hover:text-[#111111] transition-colors">
              Back to Home
            </button>
          )}
          {orderType === "plan" ? (
            <button onClick={() => navigate("ready-series")} className="inline-flex items-center justify-center gap-2 border border-[#D0CCC4] bg-white text-[#111] px-8 py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:border-[#111] transition-colors">
              Browse Ready-to-Go Meals
            </button>
          ) : (
            <button onClick={() => navigate("home")} className="inline-flex items-center justify-center gap-2 border border-[#D0CCC4] bg-white text-[#111] px-8 py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:border-[#111] transition-colors">
              Back to Home
            </button>
          )}
        </div>
      </div>

      {/* ── Sign-Up Modal ── */}
      {showSignup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !signupDone && setShowSignup(false)} />
          <div className="relative bg-white w-full max-w-[440px] p-8 border border-[#E8E4DC]">
            <button onClick={() => setShowSignup(false)} className="absolute top-4 right-4 text-[#aaa] hover:text-[#111] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>

            {!signupDone ? (
              <>
                <div className="font-mono text-[10px] tracking-[0.4em] text-[#aaa] uppercase mb-2">Create Account</div>
                <h2 className="font-display text-[26px] font-bold mb-1">Join Performance Meals</h2>
                <p className="text-[#666] text-[13px] mb-6">Earn points on your order history, get exclusive discounts, and track every delivery.</p>

                {/* Points incentive */}
                <div className="bg-[#F5B300]/20 border border-[#F5B300]/50 px-4 py-3 mb-6 flex items-center gap-3">
                  <span className="text-[22px]">🪙</span>
                  <p className="text-[12px] text-[#555]">
                    Your past order would have earned <strong className="text-[#111]">+{Math.floor(finalTotal)} pts</strong> — future orders will from now on.
                  </p>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { label: "Full Name", val: suName, set: setSuName, type: "text", placeholder: "Your name" },
                    { label: "Email", val: suEmail, set: setSuEmail, type: "email", placeholder: "you@email.com" },
                    { label: "Phone (WhatsApp updates)", val: suPhone, set: setSuPhone, type: "tel", placeholder: "+65 9123 4567" },
                    { label: "Password", val: suPassword, set: setSuPassword, type: "password", placeholder: "Min. 8 characters" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#888] block mb-1">{f.label}</label>
                      <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                        className="w-full border border-[#D0CCC4] px-4 py-3 text-[14px] bg-white outline-none focus:border-[#111] transition-colors" />
                    </div>
                  ))}
                </div>

                <button
                  disabled={!suName || !suEmail || !suPassword}
                  onClick={() => setSignupDone(true)}
                  className="w-full bg-[#111] text-white py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors disabled:opacity-40">
                  Create My Account →
                </button>
                <p className="text-center text-[11px] text-[#aaa] mt-3">Free forever · No spam · Cancel anytime</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-[#F5B300] rounded-full flex items-center justify-center mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <h2 className="font-display text-[26px] font-bold mb-2">Welcome to Performance Meals, {suName || "there"}!</h2>
                <p className="text-[#555] text-[14px] mb-5">Your account is ready. We've sent confirmation details to your email and WhatsApp.</p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-3 bg-[#075E54]/10 border border-[#075E54]/20 px-4 py-3">
                    <span className="text-[16px]">💬</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">WhatsApp confirmation</p>
                      <p className="text-[12px] text-[#666]">{suPhone || "+65 XXXX XXXX"}</p>
                    </div>
                    <span className="text-[#25D366] text-[11px] font-bold">✓ Sent</span>
                  </div>
                  <div className="flex items-center gap-3 bg-[#0E0E0E]/5 border border-[#0E0E0E]/10 px-4 py-3">
                    <span className="text-[16px]">✉️</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">Email confirmation</p>
                      <p className="text-[12px] text-[#666]">{suEmail || "your@email.com"}</p>
                    </div>
                    <span className="text-[#111] bg-[#F5B300] text-[10px] font-bold px-2 py-0.5">✓ Sent</span>
                  </div>
                </div>
                <button onClick={() => { setShowSignup(false); navigate("account"); }}
                  className="w-full bg-[#111] text-white py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                  Go to My Account →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
