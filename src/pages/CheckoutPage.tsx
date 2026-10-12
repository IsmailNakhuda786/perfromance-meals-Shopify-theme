import { useState } from "react";
import { CartItem, Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
  cart: CartItem[];
  savedAddress: { name: string; phone: string; line1: string; unit: string; postal: string } | null;
  requireAccount?: boolean;
  onComplete: (isGuest: boolean, promoCode: string, promoDiscount: number, total: number, orderDetails: { name: string; address: string; date: string; slot: string; deliveryFee: number }) => void;
}

const DATES = ["Mon 4", "Tue 5", "Wed 6", "Thu 7", "Fri 8", "Sat 9"];
const SLOTS = ["6am – 9am", "9am – 12pm", "12pm – 3pm", "3pm – 6pm"];

type AuthMode = null | "guest" | "signin" | "signup" | "signup_done" | "signin_done";

export default function CheckoutPage({ navigate, cart, savedAddress, requireAccount = false, onComplete }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState(DATES[0]);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [addrName, setAddrName] = useState(savedAddress?.name ?? "Jerome Tan");
  const [addrLine, setAddrLine] = useState(savedAddress?.line1 ?? "123 Toa Payoh Lor 4, #08-22");
  const [addrPostal, setAddrPostal] = useState(savedAddress?.postal ?? "310123");
  const [useWallet, setUseWallet] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<"invalid" | "expired" | null>(null);

  const FREE_DELIVERY_THRESHOLD = 120;

  const VALID_PROMOS: Record<string, { discount: number; flat?: number; expired?: boolean }> = {
    "WELCOME10": { discount: 0.10 },
    "WELCOME15": { discount: 0.15 },
    "SUMMER20":  { discount: 0.20, expired: true },
    "FITLIFE":   { discount: 0.12 },
    "READY20":   { discount: 0.20 },
    "SG61":      { discount: 0, flat: 6.10 },
    "FREEZER5":  { discount: 0, flat: 5.00 },
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const entry = VALID_PROMOS[code];
    if (!entry) { setPromoError("invalid"); setPromoApplied(false); return; }
    if (entry.expired) { setPromoError("expired"); setPromoApplied(false); return; }
    setPromoError(null);
    setPromoApplied(true);
  };
  const [signupConfirmed, setSignupConfirmed] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const promoEntry = promoApplied ? VALID_PROMOS[promoCode.trim().toUpperCase()] : null;
  const promoRate = promoEntry?.discount ?? 0;
  const promoFlat = promoEntry?.flat ?? 0;
  const promoDiscount = promoFlat > 0 ? promoFlat : subtotal * promoRate;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : 10;
  const total = Math.max(0, subtotal + deliveryFee - (useWallet ? 12.5 : 0) - promoDiscount);

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {/* Minimal nav */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E2DA]">
        <button onClick={() => navigate("home")} className="text-[16px] font-bold tracking-[0.1em] text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>
          PERFORMANCE <span className="text-[#F5B300]">MEALS</span>
        </button>
        <div className="flex items-center gap-2">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step === n ? "bg-[#111] text-white" : step > n ? "bg-[#F5B300] text-[#111]" : "bg-[#E5E2DA] text-[#aaa]"}`}>
                {step > n ? "✓" : n}
              </div>
              {n < 2 && <div className={`w-8 h-px ${step > n ? "bg-[#F5B300]" : "bg-[#E5E2DA]"}`} />}
            </div>
          ))}
        </div>
        <button onClick={() => step > 1 ? setStep(1) : navigate("ready-series")} className="text-[#aaa] hover:text-[#111] text-[13px] transition-colors">
          {step > 1 ? "← Back" : "✕"}
        </button>
      </div>

      <div className="flex-1 flex flex-col-reverse lg:grid lg:grid-cols-5">
        {/* Left: form */}
        <div className="lg:col-span-3 px-6 py-10 max-w-[580px] mx-auto w-full lg:mx-0 lg:ml-auto">

          {/* ── AUTH GATE ── */}
          {authMode === null && (
            <div>
              <h1 className="font-display text-[28px] sm:text-[34px] font-bold mb-2">Almost there.</h1>
              {requireAccount ? (
                <>
                  <p className="text-[#666] text-[14px] mb-4">Box Subscription requires an account to manage your deliveries, swap meals, and earn rewards.</p>
                  <div className="flex items-start gap-3 bg-[#F5B300]/10 border border-[#F5B300]/40 px-4 py-3 mb-6 text-[12px] text-[#7B5900]">
                    <span className="text-[16px] shrink-0">📦</span>
                    <span>A subscription account lets you pause, skip, or cancel deliveries at any time from your dashboard.</span>
                  </div>
                </>
              ) : (
                <p className="text-[#666] text-[14px] mb-8">Sign in to save your order history and earn rewards points — or continue as a guest.</p>
              )}
              <div className="space-y-3 mb-6">
                <button onClick={() => setAuthMode("signup")}
                  className="w-full bg-[#111] text-white py-4 text-[13px] font-bold tracking-[0.15em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors flex items-center justify-between px-6">
                  <span>Create Account</span>
                  <span className="text-[11px] font-normal text-current/60 normal-case tracking-normal">Earn points on this order →</span>
                </button>
                <button onClick={() => setAuthMode("signin")}
                  className="w-full border-2 border-[#111] text-[#111] py-4 text-[13px] font-bold tracking-[0.15em] uppercase hover:bg-[#111] hover:text-white transition-colors">
                  Sign In to Existing Account
                </button>
                {!requireAccount && (
                  <button onClick={() => setAuthMode("guest")}
                    className="w-full text-[#888] text-[13px] py-3 hover:text-[#111] transition-colors border border-[#D0CCC4] hover:border-[#111]">
                    Continue as Guest
                  </button>
                )}
              </div>
              {!requireAccount && (
                <p className="text-[11px] text-[#aaa] text-center">Guest orders earn no reward points and won't appear in order history.</p>
              )}
            </div>
          )}

          {/* ── SIGN UP FORM ── */}
          {authMode === "signup" && (
            <div>
              <button onClick={() => setAuthMode(null)} className="text-[#888] text-[12px] mb-6 hover:text-[#111] transition-colors">← Back</button>
              <h1 className="font-display text-[28px] font-bold mb-6">Create your account</h1>
              <div className="space-y-4 mb-6">
                {[
                  { label: "Full Name", val: authName, set: setAuthName, type: "text", placeholder: "Jerome Tan" },
                  { label: "Email", val: authEmail, set: setAuthEmail, type: "email", placeholder: "jerome@email.com" },
                  { label: "Phone (WhatsApp)", val: authPhone, set: setAuthPhone, type: "tel", placeholder: "+65 9123 4567" },
                  { label: "Password", val: authPassword, set: setAuthPassword, type: "password", placeholder: "Min. 8 characters" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#888] block mb-1.5">{f.label}</label>
                    <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full border border-[#D0CCC4] px-4 py-3 text-[14px] bg-white outline-none focus:border-[#111] transition-colors" />
                  </div>
                ))}
              </div>
              <div className="bg-[#F5B300]/20 border border-[#F5B300]/50 px-4 py-3 mb-6 text-[12px] text-[#555]">
                🎁 You'll earn <strong className="text-[#111]">points on this order</strong> and unlock referral rewards after signup.
              </div>
              <button
                disabled={!authName || !authEmail || !authPassword}
                onClick={() => setAuthMode("signup_done")}
                className="w-full bg-[#111] text-white py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors disabled:opacity-40">
                Create Account & Continue →
              </button>
            </div>
          )}

          {/* ── SIGNUP SUCCESS ── */}
          {authMode === "signup_done" && !signupConfirmed && (
            <div>
              <div className="w-16 h-16 bg-[#F5B300] rounded-full flex items-center justify-center mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h1 className="font-display text-[28px] font-bold mb-2">Account created!</h1>
              <p className="text-[#555] text-[14px] mb-5">Welcome to Performance Meals, {authName || "there"}. We've sent a confirmation to your email and WhatsApp.</p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 bg-[#075E54]/10 border border-[#075E54]/20 px-4 py-3 rounded-lg">
                  <span className="text-[18px]">💬</span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#111]">WhatsApp confirmation sent</p>
                    <p className="text-[12px] text-[#666]">{authPhone || "+65 XXXX XXXX"}</p>
                  </div>
                  <span className="ml-auto text-[#25D366] text-[11px] font-bold">✓ Sent</span>
                </div>
                <div className="flex items-center gap-3 bg-[#0E0E0E]/5 border border-[#0E0E0E]/10 px-4 py-3 rounded-lg">
                  <span className="text-[18px]">✉️</span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#111]">Email confirmation sent</p>
                    <p className="text-[12px] text-[#666]">{authEmail || "your@email.com"}</p>
                  </div>
                  <span className="ml-auto text-[#F5B300] bg-[#111] text-[10px] font-bold px-2 py-0.5">✓ Sent</span>
                </div>
              </div>
              <button onClick={() => setSignupConfirmed(true)}
                className="w-full bg-[#111] text-white py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                Continue to Delivery →
              </button>
            </div>
          )}

          {/* ── SIGN IN FORM ── */}
          {authMode === "signin" && (
            <div>
              <button onClick={() => setAuthMode(null)} className="text-[#888] text-[12px] mb-6 hover:text-[#111] transition-colors">← Back</button>
              <h1 className="font-display text-[28px] font-bold mb-6">Welcome back</h1>
              <div className="space-y-4 mb-6">
                {[
                  { label: "Email", val: authEmail, set: setAuthEmail, type: "email", placeholder: "jerome@email.com" },
                  { label: "Password", val: authPassword, set: setAuthPassword, type: "password", placeholder: "Your password" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#888] block mb-1.5">{f.label}</label>
                    <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full border border-[#D0CCC4] px-4 py-3 text-[14px] bg-white outline-none focus:border-[#111] transition-colors" />
                  </div>
                ))}
              </div>
              <button
                disabled={!authEmail || !authPassword}
                onClick={() => setAuthMode("signin_done")}
                className="w-full bg-[#111] text-white py-4 text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors mb-3 disabled:opacity-40">
                Sign In & Continue →
              </button>
              <p className="text-center text-[12px] text-[#aaa]">Forgot password? <span className="text-[#111] font-semibold cursor-pointer hover:underline">Reset it</span></p>
            </div>
          )}

          {/* ── STEP 1: DELIVERY ── */}
          {(authMode === "guest" || authMode === "signin_done" || (authMode === "signup_done" && signupConfirmed)) && step === 1 && (
            <div>
              <h1 className="font-display text-[26px] sm:text-[32px] font-bold mb-4">Delivery</h1>

              {/* Guest warning banner */}
              {authMode === "guest" && (
                <div className="bg-[#FFF8E6] border border-[#F5B300]/50 px-4 py-4 mb-6 flex gap-3 items-start">
                  <span className="text-[22px] shrink-0">⚠️</span>
                  <div>
                    <p className="font-bold text-[13px] text-[#7B5900] mb-1">You're checking out as a guest — you'll miss out on:</p>
                    <ul className="text-[12px] text-[#7B5900] space-y-0.5 list-disc list-inside">
                      <li>Performance Meals reward points (worth up to $12/month)</li>
                      <li>Exclusive member discounts and early access deals</li>
                      <li>Order history, easy reorders, and delivery tracking</li>
                      <li>Referral bonuses — earn $10 credit per friend</li>
                    </ul>
                    <button onClick={() => setAuthMode(null)} className="mt-3 text-[12px] font-bold text-[#7B5900] underline hover:no-underline">
                      Create a free account instead →
                    </button>
                  </div>
                </div>
              )}

              {/* Address — 4 fields only */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <input placeholder="Full name" value={addrName} onChange={(e) => setAddrName(e.target.value)}
                  className="col-span-2 sm:col-span-1 border border-[#D0CCC4] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#111] transition-colors" />
                <input placeholder="Phone" defaultValue={savedAddress?.phone ?? "+65 9123 4567"}
                  className="col-span-2 sm:col-span-1 border border-[#D0CCC4] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#111] transition-colors" />

                <input placeholder="Street address + unit" value={addrLine} onChange={(e) => setAddrLine(e.target.value)}
                  className="col-span-2 border border-[#D0CCC4] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#111] transition-colors" />
                <input placeholder="Postal code" value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)}
                  className="border border-[#D0CCC4] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#111] transition-colors" />
                <input placeholder="Delivery note (optional)"
                  className="border border-[#D0CCC4] bg-white px-4 py-3 text-[14px] text-[#aaa] outline-none focus:border-[#111] transition-colors" />
              </div>

              {/* Date */}
              <div className="mb-6">
                <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-3">Delivery Date</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {DATES.map((d) => (
                    <button key={d} onClick={() => setDate(d)}
                      className={`shrink-0 px-5 py-3 border text-center transition-all ${date === d ? "bg-[#111] text-white border-[#111]" : "border-[#D0CCC4] bg-white hover:border-[#111]"}`}>
                      <div className={`text-[11px] ${date === d ? "text-white/50" : "text-[#aaa]"}`}>{d.split(" ")[0]}</div>
                      <div className="font-bold text-[18px] leading-tight">{d.split(" ")[1]}</div>
                      <div className={`text-[10px] mt-0.5 ${date === d ? "text-[#F5B300]" : "text-[#ccc]"}`}>Sep</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slot */}
              <div className="mb-10">
                <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-3">Time Slot</p>
                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.map((s) => (
                    <button key={s} onClick={() => setSlot(s)}
                      className={`py-3 text-[13px] border transition-all ${slot === s ? "bg-[#111] text-white border-[#111]" : "border-[#D0CCC4] bg-white hover:border-[#111] text-[#333]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(2)}
                className="w-full bg-[#111111] text-white py-4 text-[13px] font-bold tracking-[0.15em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                Continue to Payment →
              </button>
            </div>
          )}

          {/* ── STEP 2: PAYMENT ── */}
          {(authMode === "guest" || authMode === "signin_done" || (authMode === "signup_done" && signupConfirmed)) && step === 2 && (
            <div>
              <h1 className="font-display text-[26px] sm:text-[32px] font-bold mb-8">Payment</h1>

              {/* Delivery recap — tap to edit */}
              <button onClick={() => setStep(1)}
                className="w-full flex items-center justify-between bg-white border border-[#E5E2DA] px-4 py-3 mb-6 hover:border-[#111] transition-colors group">
                <div className="text-left">
                  <div className="text-[12px] text-[#888]">Delivering to</div>
                  <div className="text-[14px] font-medium text-[#111]">123 Toa Payoh Lor 4, #08-22 · {date} Sep · {slot}</div>
                </div>
                <span className="text-[12px] text-[#888] group-hover:text-[#111] transition-colors">Edit</span>
              </button>

              {/* Wallet toggle */}
              {true && (
                <button onClick={() => setUseWallet((v) => !v)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 border mb-5 transition-all ${useWallet ? "bg-[#111] text-white border-[#111]" : "bg-white border-[#E5E2DA] hover:border-[#111]"}`}>
                  <div className="flex items-center gap-2.5 text-left">
                    <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0 ${useWallet ? "bg-[#F5B300] border-[#F5B300]" : "border-[#ccc]"}`}>
                      {useWallet && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                    </div>
                    <span className={`text-[13px] ${useWallet ? "text-white" : "text-[#333]"}`}>Apply wallet credit</span>
                  </div>
                  <span className={`font-mono text-[13px] font-bold ${useWallet ? "text-[#F5B300]" : "text-[#888]"}`}>
                    {useWallet ? "–$12.50" : "$12.50 available"}
                  </span>
                </button>
              )}

              {/* Card fields */}
              <div className="space-y-3 mb-6">
                <input placeholder="Card number" defaultValue="4242 4242 4242 4242"
                  className="w-full border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] font-mono outline-none focus:border-[#111] transition-colors" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="MM / YY" defaultValue="08 / 28"
                    className="border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] font-mono outline-none focus:border-[#111] transition-colors" />
                  <input placeholder="CVC"
                    className="border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] font-mono outline-none focus:border-[#111] transition-colors" />
                </div>
              </div>

              {/* PayNow */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-[#E5E2DA]" />
                <span className="text-[#ccc] text-[11px]">or</span>
                <div className="flex-1 h-px bg-[#E5E2DA]" />
              </div>
              <button className="w-full border border-[#D0CCC4] bg-white py-3.5 text-[13px] text-[#888] hover:border-[#111] hover:text-[#111] transition-colors flex items-center justify-center gap-1.5">
                <span className="font-bold text-[#E43B4F]">Pay</span>Now
              </button>
              <p className="text-[#aaa] text-[11px] text-center mt-1.5 mb-8">Singapore instant bank transfer — no card needed</p>

              {/* Promo code */}
              <div className="mb-5">
                <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-2">Promo / Discount Code</p>
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); setPromoError(null); }}
                    placeholder="e.g. WELCOME10"
                    className={`flex-1 border bg-white px-4 py-3 text-[14px] font-mono outline-none transition-colors uppercase ${promoApplied ? "border-green-500 bg-green-50" : promoError ? "border-red-400" : "border-[#D0CCC4] focus:border-[#111]"}`}
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-5 py-3 bg-[#111] text-white text-[12px] font-bold tracking-widest uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                    Apply
                  </button>
                </div>
                {promoApplied && (
                  <p className="text-green-600 text-[12px] mt-1.5 font-medium flex items-center gap-1.5">
                    <span>✓</span> Code <strong>{promoCode}</strong> applied — {promoFlat > 0 ? `$${promoFlat.toFixed(2)} off` : `${Math.round(promoRate * 100)}% off`} (–${promoDiscount.toFixed(2)})
                  </p>
                )}
                {promoError === "invalid" && (
                  <p className="text-red-500 text-[12px] mt-1.5 font-medium flex items-center gap-1.5">
                    <span>✕</span> Invalid promo code. Check spelling or try another.
                  </p>
                )}
                {promoError === "expired" && (
                  <p className="text-red-500 text-[12px] mt-1.5 font-medium flex items-center gap-1.5">
                    <span>⏰</span> This promo code has expired. Check our latest offers!
                  </p>
                )}
              </div>

              {/* Save card */}
              <div className="mb-6">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)}
                    className="mt-0.5 accent-[#111]" />
                  <span className="text-[13px] text-[#333]">Save this card for faster checkout next time</span>
                </label>
              </div>

              <button onClick={() => onComplete(authMode === "guest", promoApplied ? promoCode.trim().toUpperCase() : "", promoDiscount, total, { name: addrName, address: `${addrLine}, S${addrPostal}`, date, slot, deliveryFee })}
                className="w-full bg-[#111111] text-white py-4 text-[13px] font-bold tracking-[0.15em] uppercase hover:bg-[#F5B300] hover:text-[#111] transition-colors">
                Place Order — ${total.toFixed(2)}
              </button>
              <p className="text-[#ccc] text-[11px] text-center mt-3">🔒 Stripe · Free returns within 7 days</p>
            </div>
          )}
        </div>

        {/* Right: order summary — sticky on desktop, stacked on mobile */}
        <div className="lg:col-span-2 bg-white border-b lg:border-b-0 lg:border-l border-[#E5E2DA]">
          <div className="sticky top-0 p-8">
            <h3 className="font-display text-[18px] font-bold mb-6">Order Summary</h3>

            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div key={`${item.id}-${item.type}`} className="flex gap-3">
                  <div className="relative shrink-0">
                    <img src={item.img} alt={item.name} className="w-14 h-14 object-cover bg-[#F0EDE8]" />
                    <span className="absolute -top-1.5 -right-1.5 bg-[#111] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{item.qty}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-snug">{item.name}</p>
                    {item.planLabel && <p className="text-[11px] text-[#888] mt-0.5">{item.planLabel}</p>}
                    <p className="font-bold text-[13px] mt-1">${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E5E2DA] pt-4 space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#888]">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-[#888]">Delivery</span>
                {deliveryFee === 0
                  ? <span className="text-green-600 font-medium">Free 🎉</span>
                  : <span>${deliveryFee.toFixed(2)}</span>
                }
              </div>
              {deliveryFee > 0 && (
                <div className="text-[11px] text-[#888]">
                  Add ${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for free delivery
                  <div className="mt-1.5 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F5B300] rounded-full transition-all" style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }} />
                  </div>
                </div>
              )}
              {useWallet && <div className="flex justify-between text-green-600"><span>Wallet credit</span><span>–$12.50</span></div>}
              {promoApplied && <div className="flex justify-between text-green-600"><span>Promo ({promoCode})</span><span>–${promoDiscount.toFixed(2)}</span></div>}
            </div>
            <div className="border-t border-[#E5E2DA] pt-4 mt-2 flex justify-between items-center">
              <span className="font-bold">Total</span>
              <span className="font-display text-[22px] font-bold">${total.toFixed(2)}</span>
            </div>

            <div className="mt-6 space-y-2 text-[12px] text-[#aaa]">
              <div>🚚 Same-day delivery for orders before 12pm</div>
              <div>❄️ Meals arrive frozen and vacuum-sealed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
