import { useState } from "react";
import type { Page } from "@/data";

interface Props {
  onClose: () => void;
  navigate: (page: Page) => void;
  navigateToWizard?: (plan?: string) => void;
}

type Tab = "promo" | "sub";

function ArrowRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function PromoPopup({ onClose, navigate, navigateToWizard }: Props) {
  const [tab, setTab] = useState<Tab>("promo");
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText("READY20").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative flex flex-col overflow-hidden" style={{ background: "#191919", border: "1px solid #f5b800", width: "min(560px, 96vw)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="font-bold text-[#f5b800] text-[10px] tracking-[0.1em] uppercase" style={{ fontFamily: "Inter, sans-serif" }}>
            {tab === "promo" ? "THIS WEEK ONLY" : "READY-SERIES SUBSCRIPTION"}
          </span>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ height: "42px" }}>
          {(["promo", "sub"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex flex-1 items-center justify-center font-bold text-[11px] tracking-[0.06em] transition-colors"
              style={{
                fontFamily: "Inter, sans-serif",
                background: tab === t ? "#f5b800" : "#242424",
                color: tab === t ? "#191919" : "#fff",
                borderBottom: tab === t ? "2px solid #f5b800" : "none",
              }}
            >
              {t === "promo" ? "PROMOTIONAL OFFER" : "SUBSCRIPTION DEAL"}
            </button>
          ))}
        </div>

        {/* ── PROMO tab ── */}
        {tab === "promo" && (
          <div className="flex flex-col gap-4 p-6">
            <p className="font-bold leading-[1.05] text-white" style={{ fontFamily: "Outfit, sans-serif", fontSize: "clamp(22px, 3.5vw, 32px)" }}>
              20% OFF THE MEALS THAT KEEP UP.
            </p>
            <p className="text-[#d6d4ce] text-[13px] leading-[1.5]" style={{ fontFamily: "Inter, sans-serif" }}>
              Save on selected Ready Series meals. Stock the freezer once and move through Singapore's busiest days without missing dinner.
            </p>

            {/* Code box */}
            <div className="bg-white flex items-center justify-between px-4" style={{ height: "56px" }}>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[#6c6a66] text-[9px] tracking-[0.1em]" style={{ fontFamily: "Inter, sans-serif" }}>PROMO CODE</span>
                <span className="font-bold text-black text-[20px] leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>READY20</span>
              </div>
              <button onClick={copyCode}
                className="flex items-center gap-2 font-bold text-[#191919] text-[12px] hover:opacity-80 transition-opacity"
                style={{ fontFamily: "Inter, sans-serif", background: "#f5b800", height: "38px", padding: "0 16px" }}
              >
                {copied ? "Copied!" : "Copy code"} <ArrowRight />
              </button>
            </div>

            <p className="text-[#b9b7b0] text-[10px] leading-[1.5]" style={{ fontFamily: "Inter, sans-serif" }}>
              Valid until 11:59pm SGT, 18 October 2026. Selected meals only. One use per customer.
            </p>

            <button onClick={() => { navigate("ready-series"); onClose(); }}
              className="flex items-center justify-center gap-2 w-full font-bold text-[#191919] text-[12px] hover:opacity-85 transition-opacity"
              style={{ fontFamily: "Inter, sans-serif", background: "#f5b800", height: "42px" }}
            >
              Shop selected meals <ArrowRight />
            </button>
          </div>
        )}

        {/* ── SUBSCRIPTION tab ── */}
        {tab === "sub" && (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1.5">
              <p className="font-bold text-white leading-tight" style={{ fontFamily: "Outfit, sans-serif", fontSize: "clamp(18px, 2.5vw, 26px)" }}>
                SET THE FREEZER. SAVE EVERY CYCLE.
              </p>
              <p className="text-[#d6d4ce] text-[12px] leading-[1.5]" style={{ fontFamily: "Inter, sans-serif" }}>
                Choose a package. Pause, skip or cancel anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Everyday 12 */}
              <div className="flex flex-col justify-between p-4" style={{ background: "#fff", border: "1px solid #d8d6d0" }}>
                <div className="flex flex-col gap-1.5 mb-4">
                  <p className="font-bold text-black text-[18px] leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>Everyday 12</p>
                  <p className="text-[#6c6a66] text-[11px]" style={{ fontFamily: "Inter, sans-serif" }}>12 meals · every 4 weeks</p>
                  <p className="font-bold text-black text-[17px]" style={{ fontFamily: "Outfit, sans-serif" }}>$10.90 / meal</p>
                  <p className="font-bold text-[#187a4d] text-[11px]" style={{ fontFamily: "Inter, sans-serif" }}>Save $96 over 3 months</p>
                </div>
                <button onClick={() => { navigateToWizard?.("everyday-12"); onClose(); }}
                  className="flex items-center justify-center gap-2 w-full font-bold text-[#191919] text-[12px] hover:opacity-85 transition-opacity"
                  style={{ fontFamily: "Inter, sans-serif", background: "#f5b800", height: "38px" }}
                >
                  Select Everyday 12 <ArrowRight />
                </button>
              </div>

              {/* Momentum 18 */}
              <div className="flex flex-col justify-between p-4" style={{ background: "#fff3cc", border: "2px solid #f5b800" }}>
                <div className="flex flex-col gap-1.5 mb-4">
                  <span className="font-bold text-[#f5b800] text-[9px] tracking-[0.08em] uppercase" style={{ fontFamily: "Inter, sans-serif" }}>MOST POPULAR</span>
                  <p className="font-bold text-black text-[18px] leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>Momentum 18</p>
                  <p className="text-[#6c6a66] text-[11px]" style={{ fontFamily: "Inter, sans-serif" }}>18 meals · every 4 weeks</p>
                  <p className="font-bold text-black text-[17px]" style={{ fontFamily: "Outfit, sans-serif" }}>$9.90 / meal</p>
                  <p className="font-bold text-[#187a4d] text-[11px]" style={{ fontFamily: "Inter, sans-serif" }}>Save $216 over 6 months</p>
                </div>
                <button onClick={() => { navigateToWizard?.("momentum-18"); onClose(); }}
                  className="flex items-center justify-center gap-2 w-full font-bold text-[#191919] text-[12px] hover:opacity-85 transition-opacity"
                  style={{ fontFamily: "Inter, sans-serif", background: "#f5b800", height: "38px" }}
                >
                  Select Momentum 18 <ArrowRight />
                </button>
              </div>
            </div>

            <p className="text-[#b9b7b0] text-[10px] text-center" style={{ fontFamily: "Inter, sans-serif" }}>
              Account required · Free delivery · Monthly menu rotation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
