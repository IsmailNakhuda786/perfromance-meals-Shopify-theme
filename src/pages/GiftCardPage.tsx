import { useState } from "react";
import { Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
}

const AMOUNTS = [25, 50, 100, 150];

type Step = "configure" | "payment" | "confirmed";

export default function GiftCardPage({ navigate }: Props) {
  const [step, setStep] = useState<Step>("configure");
  const [amount, setAmount] = useState(50);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<"email" | "physical">("email");
  const [saveCard, setSaveCard] = useState(false);

  const finalAmount = amount + (delivery === "physical" ? 5 : 0);
  const canProceed = recipientEmail.includes("@") && senderName.trim().length > 0;

  const giftCode = "FRE-GIFT-X4K2-9MQT";

  if (step === "confirmed") {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-[560px] w-full text-center">
          {/* Confetti elements */}
          <div className="relative mb-8">
            <div className="absolute -top-4 left-8 w-5 h-5 bg-[#F5B300] rounded-full opacity-50" />
            <div className="absolute top-2 right-10 w-7 h-7 bg-[#F5B300] rounded-full opacity-40" />
            <div className="absolute -top-2 right-3 w-3 h-3 bg-[#F5B300] opacity-50" />
            <div className="absolute top-6 left-14 w-4 h-4 bg-[#F5B300] opacity-40" />
            <div className="w-20 h-20 bg-[#F5B300] rounded-full flex items-center justify-center mx-auto">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>

          <div className="font-mono text-[10px] tracking-[0.45em] text-[#111]/35 uppercase mb-3">Gift Card Sent</div>
          <h1 className="font-display text-[48px] font-bold mb-3 leading-tight">
            Gift delivered! 🎁
          </h1>
          <p className="text-[#666] text-[16px] leading-relaxed mb-10">
            Your <strong className="text-[#111]">${amount} gift card</strong> has been sent to <strong className="text-[#111]">{recipientEmail}</strong>. They'll receive it within minutes.
          </p>

          {/* Gift card preview */}
          <div className="bg-[#111111] text-white p-6 sm:p-8 mb-6 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B300]/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#F5B300]/10 rounded-full translate-y-8 -translate-x-8" />
            <div className="relative">
              <div className="font-display text-[22px] font-bold mb-1">FRESHER<span className="text-[#F5B300]">.</span></div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase mb-6">Performance Gift Card</div>
              <div className="font-display text-[32px] sm:text-[42px] font-bold text-[#F5B300] mb-1">${amount}</div>
              <div className="text-white/40 text-[13px] mb-6">Gift card value · Never expires</div>
              <div className="bg-white/5 border border-white/10 px-5 py-3 inline-block">
                <div className="font-mono text-[16px] text-[#F5B300] tracking-[0.3em]">{giftCode}</div>
              </div>
              {recipientName && (
                <div className="mt-4 text-white/40 text-[12px]">For: {recipientName}</div>
              )}
              {message && (
                <div className="mt-2 text-white/50 text-[13px] italic max-w-[340px]">"{message}"</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E2DA] p-5 text-left mb-8">
            <div className="font-mono text-[10px] tracking-[0.3em] text-[#999] uppercase mb-4">Delivery Summary</div>
            <div className="space-y-3">
              {[
                { label: "Sent to", value: recipientEmail },
                { label: "From", value: senderName },
                { label: "Delivery", value: delivery === "email" ? "Email — instant delivery" : "Physical card — 3–5 business days" },
                { label: "Amount paid", value: `$${finalAmount.toFixed(2)}` },
              ].map((d) => (
                <div key={d.label} className="flex items-start justify-between gap-4">
                  <span className="text-[#999] text-[13px] shrink-0">{d.label}</span>
                  <span className="text-[#111] text-[13px] font-medium text-right">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => { setStep("configure"); setRecipientEmail(""); setSenderName(""); setMessage(""); }}
              className="flex-1 bg-[#F5B300] text-[#111] py-4 text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-[#111] hover:text-white transition-colors">
              Send Another →
            </button>
            <button onClick={() => navigate("home")}
              className="flex-1 border border-[#D0CCC4] bg-white text-[#111] py-4 text-[12px] font-bold tracking-[0.15em] uppercase hover:border-[#111] transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Minimal header with step indicator */}
      <div className="bg-white border-b border-[#E5E2DA] px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate("home")} className="font-display text-[20px] font-bold text-[#111]">
          FRESHER<span className="text-[#F5B300]">.</span>
        </button>
        <div className="flex items-center gap-3">
          {(["configure", "payment"] as Step[]).map((s, i) => {
            const n = i + 1;
            const isDone = step === "payment" && s === "configure";
            const isActive = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${isDone ? "bg-[#F5B300] border-[#F5B300] text-[#111]" : isActive ? "bg-[#111] border-[#111] text-white" : "bg-white border-[#D0CCC4] text-[#aaa]"}`}>
                  {isDone ? "✓" : n}
                </div>
                <span className={`text-[11px] uppercase tracking-wider hidden sm:block ${isActive ? "text-[#111] font-medium" : "text-[#aaa]"}`}>
                  {s === "configure" ? "Gift Details" : "Payment"}
                </span>
                {i < 1 && <div className={`w-8 h-px ${step === "payment" ? "bg-[#F5B300]" : "bg-[#E5E2DA]"}`} />}
              </div>
            );
          })}
        </div>
        <button onClick={() => step === "payment" ? setStep("configure") : navigate("home")}
          className="text-[#aaa] hover:text-[#111] text-[13px] transition-colors">
          {step === "payment" ? "← Back" : "✕"}
        </button>
      </div>

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* ── STEP 1: CONFIGURE ── */}
        {step === "configure" && (
          <div className="lg:col-span-3">
            <h1 className="font-display text-[36px] font-bold mb-2">Gift Card</h1>
            <p className="text-[#666] text-[15px] mb-8">Works on any Ready-to-Go order, Build-A-Box, or Meal Plan subscription.</p>

            {/* Amount */}
            <div className="mb-8">
              <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-3">Choose Amount</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {AMOUNTS.map((a) => (
                  <button key={a} onClick={() => setAmount(a)}
                    className={`py-4 text-center border-2 transition-all font-display text-[22px] font-bold ${amount === a ? "border-[#F5B300] bg-white text-[#111]" : "border-[#D0CCC4] bg-white text-[#888] hover:border-[#999]"}`}>
                    ${a}
                    {amount === a && <div className="text-[10px] font-normal font-body text-[#F5B300] mt-0.5 tracking-widest">Selected</div>}
                  </button>
                ))}
              </div>
              <p className="text-[#aaa] text-[12px]">Gift cards never expire and can be used on any purchase.</p>
            </div>

            {/* Recipient details */}
            <div className="mb-8">
              <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-3">Recipient Details</p>
              <div className="space-y-3">
                <input type="text" placeholder="Recipient name (optional)" value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] outline-none focus:border-[#111] transition-colors" />
                <input type="email" placeholder="Recipient email address *" value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] outline-none focus:border-[#111] transition-colors" />
              </div>
            </div>

            {/* Sender + message */}
            <div className="mb-8">
              <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-3">From You</p>
              <div className="space-y-3">
                <input type="text" placeholder="Your name *" value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] outline-none focus:border-[#111] transition-colors" />
                <textarea placeholder="Personal message (optional — will appear on the gift card)" value={message}
                  onChange={(e) => setMessage(e.target.value)} rows={3}
                  className="w-full border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] outline-none focus:border-[#111] transition-colors resize-none" />
              </div>
            </div>

            {/* Delivery method */}
            <div className="mb-10">
              <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#888] mb-3">Delivery Method</p>
              <div className="grid grid-cols-2 gap-3">
                {(["email", "physical"] as const).map((opt) => (
                  <button key={opt} onClick={() => setDelivery(opt)}
                    className={`py-4 px-5 border-2 text-left transition-all ${delivery === opt ? "border-[#111] bg-[#111] text-white" : "border-[#D0CCC4] bg-white text-[#333] hover:border-[#999]"}`}>
                    <div className="font-medium text-[14px]">{opt === "email" ? "📧 Email" : "📦 Physical Card"}</div>
                    <div className={`text-[12px] mt-1 ${delivery === opt ? "text-white/60" : "text-[#888]"}`}>
                      {opt === "email" ? "Instant delivery to their inbox" : "+$5 · Shipped in 3–5 business days"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep("payment")} disabled={!canProceed}
              className={`w-full py-4 text-[13px] font-bold tracking-[0.15em] uppercase transition-colors ${canProceed ? "bg-[#F5B300] text-[#111] hover:bg-[#111] hover:text-white" : "bg-[#E5E2DA] text-[#aaa] cursor-not-allowed"}`}>
              {canProceed ? "Continue to Payment →" : "Fill in required fields to continue"}
            </button>
          </div>
        )}

        {/* ── STEP 2: PAYMENT ── */}
        {step === "payment" && (
          <div className="lg:col-span-3">
            <h1 className="font-display text-[36px] font-bold mb-2">Payment</h1>
            <p className="text-[#666] text-[15px] mb-8">Enter your payment details to complete the gift card purchase.</p>

            {/* Recipient recap — tap to edit */}
            <button onClick={() => setStep("configure")}
              className="w-full flex items-center justify-between bg-white border border-[#E5E2DA] px-5 py-3.5 mb-6 hover:border-[#111] transition-colors group">
              <div className="text-left">
                <div className="text-[12px] text-[#888]">Sending to</div>
                <div className="text-[14px] font-medium text-[#111]">{recipientEmail} · {delivery === "email" ? "Email delivery" : "Physical card"}</div>
              </div>
              <span className="text-[12px] text-[#888] group-hover:text-[#111] transition-colors">Edit</span>
            </button>

            {/* Card fields */}
            <div className="space-y-3 mb-5">
              <input placeholder="Name on card" defaultValue={senderName}
                className="w-full border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] outline-none focus:border-[#111] transition-colors" />
              <input placeholder="Card number" defaultValue="4242 4242 4242 4242"
                className="w-full border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] font-mono outline-none focus:border-[#111] transition-colors" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="MM / YY" defaultValue="08 / 28"
                  className="border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] font-mono outline-none focus:border-[#111] transition-colors" />
                <input placeholder="CVC"
                  className="border border-[#D0CCC4] bg-white px-4 py-3.5 text-[14px] font-mono outline-none focus:border-[#111] transition-colors" />
              </div>
            </div>

            {/* Save card checkbox */}
            <label className="flex items-start gap-3 mb-8 cursor-pointer group">
              <div className={`mt-0.5 w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-colors ${saveCard ? "bg-[#111] border-[#111]" : "border-[#D0CCC4] group-hover:border-[#888]"}`}
                onClick={() => setSaveCard((v) => !v)}>
                {saveCard && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
              </div>
              <span className="text-[13px] text-[#555]">Save this card for faster checkout next time</span>
            </label>

            {/* PayNow divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#E5E2DA]" />
              <span className="text-[#ccc] text-[11px]">or pay with</span>
              <div className="flex-1 h-px bg-[#E5E2DA]" />
            </div>
            <button className="w-full border border-[#D0CCC4] bg-white py-3.5 text-[13px] text-[#888] hover:border-[#111] hover:text-[#111] transition-colors mb-8 flex items-center justify-center gap-1.5">
              <span className="font-bold text-[#E43B4F]">Pay</span>Now
              <span className="text-[#aaa] text-[11px] ml-1">— Singapore instant bank transfer</span>
            </button>

            <button onClick={() => setStep("confirmed")}
              className="w-full bg-[#F5B300] text-[#111] py-4 text-[13px] font-bold tracking-[0.15em] uppercase hover:bg-[#111] hover:text-white transition-colors">
              Pay ${finalAmount.toFixed(2)} & Send Gift Card →
            </button>
            <p className="text-[#aaa] text-[11px] text-center mt-3">🔒 Stripe · Gift cards are non-refundable</p>
          </div>
        )}

        {/* Order summary sidebar */}
        {(
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#E5E2DA] p-6 sticky top-4">
              <p className="font-mono text-[10px] tracking-[0.3em] text-[#999] uppercase mb-5">Order Summary</p>

              {/* Gift card preview */}
              <div className="bg-[#111] text-white p-5 mb-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#F5B300]/10 rounded-full -translate-y-6 translate-x-6" />
                <div className="relative">
                  <div className="font-display text-[16px] font-bold mb-1">FRESHER<span className="text-[#F5B300]">.</span></div>
                  <div className="font-mono text-[9px] tracking-[0.3em] text-white/40 uppercase mb-3">Gift Card</div>
                  <div className="font-display text-[36px] font-bold text-[#F5B300]">${amount}</div>
                  {recipientName && <div className="text-white/40 text-[11px] mt-2">For: {recipientName}</div>}
                  {message && <div className="text-white/30 text-[11px] mt-1 italic truncate">"{message}"</div>}
                </div>
              </div>

              <div className="space-y-2 text-[13px] border-t border-[#E5E2DA] pt-4">
                <div className="flex justify-between"><span className="text-[#888]">Gift card value</span><span>${amount}.00</span></div>
                {delivery === "physical" && <div className="flex justify-between"><span className="text-[#888]">Physical delivery</span><span>$5.00</span></div>}
                <div className="flex justify-between font-bold border-t border-[#E5E2DA] pt-3 mt-3">
                  <span>Total</span>
                  <span className="font-display text-[20px]">${finalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-[12px] text-[#aaa]">
                <div>✓ Delivered instantly by email</div>
                <div>✓ Works on all Performance Meals products</div>
                <div>✓ Never expires</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
