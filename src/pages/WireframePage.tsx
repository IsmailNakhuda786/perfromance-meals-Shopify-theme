import { useState } from "react";
import { Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
  navigateToWizard: (plan?: string) => void;
}

// Wireframe primitive components
const WBox = ({ h = "h-8", w = "w-full", className = "" }: { h?: string; w?: string; className?: string }) => (
  <div className={`${h} ${w} bg-[#D8D5CF] rounded-sm ${className}`} />
);
const WImg = ({ h = "h-32", className = "" }: { h?: string; className?: string }) => (
  <div className={`${h} w-full bg-[#C8C4BC] rounded-sm flex items-center justify-center ${className}`}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="1" stroke="#999" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#999"/><path d="m21 15-5-5L5 21" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/></svg>
  </div>
);
const WText = ({ w = "w-full", className = "" }: { w?: string; className?: string }) => (
  <div className={`h-2.5 ${w} bg-[#D8D5CF] rounded-full ${className}`} />
);
const WBtn = ({ w = "w-full", dark = false, className = "" }: { w?: string; dark?: boolean; className?: string }) => (
  <div className={`h-9 ${w} rounded-sm ${dark ? "bg-[#555]" : "bg-[#D8D5CF] border border-[#B8B4AC]"} ${className}`} />
);
const WInput = ({ w = "w-full", className = "" }: { w?: string; className?: string }) => (
  <div className={`h-9 ${w} rounded-sm border border-[#C8C4BC] bg-[#EDEBE7] ${className}`} />
);
const WNav = () => (
  <div className="h-10 w-full bg-[#444] rounded-sm flex items-center px-3 gap-3 mb-0">
    <div className="h-4 w-16 bg-[#666] rounded-full" />
    <div className="flex-1 flex gap-2 justify-center">
      {[40, 32, 28, 36, 28].map((w, i) => <div key={i} className={`h-2 bg-[#666] rounded-full`} style={{ width: w }} />)}
    </div>
    <div className="h-6 w-6 bg-[#666] rounded-full" />
  </div>
);
const WLabel = ({ children }: { children: string }) => (
  <div className="text-[9px] font-mono text-[#999] tracking-[0.2em] uppercase mb-1">{children}</div>
);
const WSection = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`border border-dashed border-[#C8C4BC] p-2 rounded-sm ${className}`}>
    <div className="text-[8px] font-mono text-[#AAAAAA] tracking-widest uppercase mb-1.5">{label}</div>
    {children}
  </div>
);

// ── Individual screen wireframes ──────────────────────────────────────────────

const WF_Home = () => (
  <div className="space-y-1.5">
    <WNav />
    <WSection label="Hero — 2 column split">
      <div className="grid grid-cols-2 gap-1">
        <div className="space-y-1 p-1 bg-[#444] rounded-sm">
          <WText w="w-3/4" className="bg-[#666]" />
          <WText w="w-full" className="h-4 bg-[#666]" />
          <WText w="w-2/3" className="bg-[#666]" />
          <WBtn dark w="w-2/3" className="mt-1" />
        </div>
        <WImg h="h-24" className="bg-[#555]" />
      </div>
    </WSection>
    <WSection label="6in60 Promise Bar">
      <div className="flex items-center gap-1.5">
        <div className="w-8 h-8 rounded-full bg-[#C8C4BC] shrink-0" />
        <div className="flex-1 space-y-1"><WText w="w-2/3" /><WText w="w-full" /></div>
        <WBtn w="w-16" />
      </div>
    </WSection>
    <WSection label="Stats Bar — 4 columns">
      <div className="grid grid-cols-4 gap-1">
        {[0,1,2,3].map(i => <div key={i} className="text-center space-y-1"><WText w="w-full" className="h-4" /><WText w="w-3/4 mx-auto" /></div>)}
      </div>
    </WSection>
    <WSection label="02 / Meal Plans — 3 cards">
      <div className="grid grid-cols-3 gap-1">
        {[0,1,2].map(i => <div key={i} className="space-y-1 border border-[#C8C4BC] p-1 rounded-sm"><WText w="w-1/2" /><WText /><WText w="w-2/3" /><WBtn /></div>)}
      </div>
    </WSection>
    <WSection label="Newsletter + Footer" className="space-y-1">
      <div className="flex gap-1"><WInput /><WBtn dark w="w-16" /></div>
      <WBox h="h-6" className="bg-[#444]" />
    </WSection>
  </div>
);

const WF_ProductDetail = () => (
  <div className="space-y-1.5">
    <WNav />
    <WSection label="Hero Banner"><WImg h="h-16" /></WSection>
    <WSection label="Category Filter — horizontal tabs">
      <div className="flex gap-1">{["All","Low Carb","High Carb","Breakfast","Protein"].map(l => <div key={l} className="h-6 px-2 bg-[#D8D5CF] rounded-sm text-[8px] flex items-center text-[#888] whitespace-nowrap">{l}</div>)}</div>
    </WSection>
    <WSection label="Meal Grid — 3 columns">
      <div className="grid grid-cols-3 gap-1.5">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="border border-[#C8C4BC] rounded-sm overflow-hidden">
            <WImg h="h-16" />
            <div className="p-1 space-y-1"><WText /><WText w="w-2/3" /><div className="grid grid-cols-4 gap-0.5">{[0,1,2,3].map(j=><WBox key={j} h="h-4" />)}</div><WBtn /></div>
          </div>
        ))}
      </div>
    </WSection>
  </div>
);

const WF_ReadySeries = () => (
  <div className="space-y-1.5">
    <WNav />
    <WSection label="Ready Series Hero + promo bar"><WImg h="h-16" /></WSection>
    <WSection label="Client Theme Picker — Cold / Warm / Espresso">
      <div className="grid grid-cols-3 gap-1">{[0,1,2].map(i => <WBtn key={i} />)}</div>
    </WSection>
    <WSection label="Purchase Mode — Single / Bundles / Subscription">
      <div className="grid grid-cols-3 gap-1">{[0,1,2].map(i => <WBtn key={i} dark={i === 2} />)}</div>
    </WSection>
    <WSection label="Subscription filters + always-visible meal details">
      <div className="flex gap-1 mb-1">{["Meals","Just Protein","Mixed"].map(l => <div key={l} className="h-6 px-2 bg-[#D8D5CF] rounded-sm text-[8px] flex items-center text-[#888]">{l}</div>)}</div>
      <div className="grid grid-cols-3 gap-1">
        {[0,1,2].map(i => <div key={i} className="border border-[#C8C4BC] p-1 space-y-1"><WImg h="h-10" /><WText /><WText w="w-2/3" /><WText /><WText /><WBtn dark /></div>)}
      </div>
    </WSection>
    <WSection label="Account gate modal"><div className="mx-auto w-1/2 border border-[#C8C4BC] p-2 space-y-1"><WText /><WText /><WBtn dark /><WBtn /></div></WSection>
  </div>
);


const WF_Wizard = () => (
  <div className="space-y-1.5">
    <div className="h-10 bg-white border border-[#D8D5CF] rounded-sm flex items-center justify-between px-3">
      <div className="h-4 w-16 bg-[#D8D5CF] rounded-full" />
      <div className="flex gap-2 items-center">{["Type","Plan","Menu","Details","Review"].map((l,i)=>(
        <div key={l} className="flex items-center gap-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] ${i===0?"bg-[#555] text-white":"bg-[#D8D5CF]"}`}>{i+1}</div>
          <span className="text-[8px] text-[#999]">{l}</span>
        </div>
      ))}</div>
      <div className="h-4 w-8 bg-[#D8D5CF] rounded-full" />
    </div>
    <WSection label="Step 1 — Programme Type">
      {["Biweekly","Monthly","2 Months","6 by 60","6 by 60 Plus"].map(p=>(
        <div key={p} className="flex items-center justify-between border border-[#C8C4BC] p-1.5 rounded-sm mb-1">
          <div className="flex gap-1.5 items-center"><div className="w-2 h-2 rounded-full bg-[#C8C4BC]"/><div className="space-y-0.5"><WText w="w-16"/><WText w="w-24"/></div></div>
          <WText w="w-10" className="h-4"/>
        </div>
      ))}
    </WSection>
    <WSection label="Step 3 — Delivery Windows">
      <div className="grid grid-cols-3 gap-1">{["Mon–Tue","Wed–Thu","Fri"].map(p => <div key={p} className="border border-[#C8C4BC] p-1 space-y-1"><WText /><div className="grid grid-cols-2 gap-1"><WImg h="h-8" /><WImg h="h-8" /></div></div>)}</div>
    </WSection>
    <WBtn dark />
  </div>
);

const WF_Checkout = () => (
  <div className="space-y-1.5">
    <div className="h-10 bg-white border border-[#D8D5CF] rounded-sm flex items-center justify-between px-3">
      <div className="h-4 w-16 bg-[#D8D5CF] rounded-full"/>
      <div className="flex gap-1">{[1,2].map(n=><div key={n} className="w-6 h-6 rounded-full bg-[#D8D5CF] flex items-center justify-center text-[8px]">{n}</div>)}</div>
      <div className="h-4 w-8 bg-[#D8D5CF] rounded-full"/>
    </div>
    <div className="grid grid-cols-5 gap-2">
      <div className="col-span-3 space-y-1.5">
        <WSection label="Delivery Address">
          <div className="grid grid-cols-2 gap-1 mb-1"><WInput /><WInput /></div>
          <WInput className="mb-1" /><WInput />
        </WSection>
        <WSection label="Delivery Date — scroll">
          <div className="flex gap-1">{[0,1,2,3,4,5].map(i=><div key={i} className="w-10 h-12 bg-[#D8D5CF] rounded-sm shrink-0"/>)}</div>
        </WSection>
        <WSection label="Time Slot — 2×2 grid">
          <div className="grid grid-cols-2 gap-1">{[0,1,2,3].map(i=><WBtn key={i}/>)}</div>
        </WSection>
        <WBtn dark />
      </div>
      <div className="col-span-2">
        <WSection label="Order Summary">
          {[0,1,2].map(i=>(
            <div key={i} className="flex gap-1.5 mb-2">
              <WImg h="h-10" className="w-10 shrink-0"/>
              <div className="flex-1 space-y-1"><WText/><WText w="w-2/3"/></div>
            </div>
          ))}
          <div className="border-t border-[#C8C4BC] pt-1 space-y-1"><WText/><WText/></div>
          <WText w="w-full" className="h-5 mt-1"/>
        </WSection>
      </div>
    </div>
  </div>
);

const WF_Account = () => (
  <div className="space-y-1.5">
    <WNav />
    <WSection label="Account Header — stats row">
      <div className="flex items-center gap-3 p-1">
        <div className="w-10 h-10 rounded-full bg-[#C8C4BC] shrink-0"/>
        <div className="flex-1 space-y-1"><WText w="w-24"/><WText w="w-16"/></div>
        <div className="grid grid-cols-3 gap-2">{[0,1,2].map(i=><div key={i} className="text-center space-y-0.5"><WText className="h-4"/><WText w="w-3/4 mx-auto"/></div>)}</div>
      </div>
    </WSection>
    <WSection label="Tab Bar">
      <div className="flex gap-1">{["Dashboard","My Plan","Order History","Wallet & Rewards","Settings"].map(t=><div key={t} className="h-7 px-2 bg-[#D8D5CF] rounded-sm text-[8px] flex items-center text-[#888] whitespace-nowrap">{t}</div>)}</div>
    </WSection>
    <WSection label="My Plan Context — Meal Plan / Ready Series">
      <div className="flex gap-1"><WBtn dark /><WBtn /></div>
    </WSection>
    <div className="grid grid-cols-3 gap-1.5">
      <WSection label="Active Plan"><div className="space-y-1"><WText/><WText w="w-2/3"/><WBtn/></div></WSection>
      <WSection label="Wallet"><div className="space-y-1"><WText className="h-5"/><WText w="w-2/3"/><WBtn/></div></WSection>
      <WSection label="Referral"><div className="space-y-1"><WText/><div className="flex gap-1"><WInput/><WBtn w="w-12" dark/></div></div></WSection>
    </div>
    <WSection label="Recent Orders — table">
      {[0,1,2].map(i=><div key={i} className="flex gap-2 mb-1"><WText w="w-1/4"/><WText w="w-1/3"/><WText w="w-1/4"/><WText w="w-12"/></div>)}
    </WSection>
  </div>
);

const WF_GiftCard = () => (
  <div className="space-y-1.5">
    <WNav />
    <WSection label="Step Header — 3 steps">
      <div className="flex gap-2 justify-center">{["Configure","Payment","Confirmed"].map((l,i)=>(
        <div key={l} className="flex items-center gap-1">
          <div className={`w-5 h-5 rounded-full text-[7px] flex items-center justify-center ${i===0?"bg-[#555] text-white":"bg-[#D8D5CF]"}`}>{i+1}</div>
          <span className="text-[8px] text-[#999]">{l}</span>
          {i<2&&<div className="w-4 h-px bg-[#D8D5CF]"/>}
        </div>
      ))}</div>
    </WSection>
    <WSection label="Step 1 — Configure Gift Card">
      <WLabel>Select Amount</WLabel>
      <div className="grid grid-cols-4 gap-1 mb-2">{[0,1,2,3].map(i=><WBtn key={i} className="h-10"/>)}</div>
      <WLabel>Recipient Details</WLabel>
      <div className="space-y-1 mb-2"><WInput/><WInput/><WInput/></div>
      <WLabel>Delivery</WLabel>
      <div className="flex gap-1"><WBtn/><WBtn/></div>
    </WSection>
    <WSection label="Gift Card Preview">
      <div className="h-20 bg-[#444] rounded-sm flex items-center justify-center">
        <WText w="w-1/3" className="bg-[#666]"/>
      </div>
    </WSection>
    <WBtn dark />
  </div>
);


const WF_Confirmation = () => (
  <div className="space-y-1.5">
    <WNav />
    <WSection label="Confirmation Hero — centered">
      <div className="text-center space-y-2 py-3">
        <div className="w-12 h-12 rounded-full bg-[#C8C4BC] mx-auto"/>
        <WText w="w-1/2 mx-auto" className="h-5"/>
        <WText w="w-2/3 mx-auto"/>
        <WText w="w-1/2 mx-auto"/>
      </div>
    </WSection>
    <WSection label="Order Summary Card">
      <div className="border border-[#C8C4BC] p-2 rounded-sm space-y-1">
        <div className="flex justify-between"><WText w="w-1/3"/><WText w="w-1/4"/></div>
        <div className="flex justify-between"><WText w="w-1/2"/><WText w="w-1/5"/></div>
        <WText className="h-px bg-[#C8C4BC]"/>
        <div className="flex justify-between"><WText w="w-1/4"/><WText w="w-1/6" className="h-4"/></div>
      </div>
    </WSection>
    <WSection label="Points Earned + Referral CTA">
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-[#C8C4BC] p-2 rounded-sm space-y-1"><WText w="w-2/3"/><WText className="h-4"/></div>
        <div className="border border-[#C8C4BC] p-2 rounded-sm space-y-1"><WText w="w-2/3"/><WBtn/></div>
      </div>
    </WSection>
    <div className="flex gap-2"><WBtn dark /><WBtn /></div>
  </div>
);

const SCREENS = [
  { id: "home",         label: "01 — Home",               WF: WF_Home,         page: "home" as Page },
  { id: "ready-series", label: "02 — Ready Series",        WF: WF_ReadySeries,  page: "ready-series" as Page },
  { id: "ready-product",label: "03 — Product Detail",      WF: WF_ProductDetail,    page: "ready-series-product" as Page },
  { id: "meal-landing", label: "06 — Meal Plan Landing",  WF: WF_Home,         page: "meal-plan-landing" as Page },
  { id: "wizard",       label: "07 — Meal Plan Wizard",   WF: WF_Wizard,       page: "meal-plan-wizard" as Page },
  { id: "checkout",     label: "08 — Checkout",           WF: WF_Checkout,     page: "checkout" as Page },
  { id: "confirm",      label: "09 — Confirmation",       WF: WF_Confirmation, page: "confirmation" as Page },
  { id: "account",      label: "10 — My Account",         WF: WF_Account,      page: "account" as Page },
  { id: "gift-card",    label: "12 — Gift Card",          WF: WF_GiftCard,     page: "gift-card" as Page },
  { id: "rewards",      label: "13 — Rewards",            WF: WF_Account,      page: "rewards" as Page },
  { id: "about",        label: "14 — About",              WF: WF_Home,         page: "about" as Page },
];

export default function WireframePage({ navigate }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const activeScreen = SCREENS.find(s => s.id === active);

  return (
    <div className="min-h-screen bg-[#EDEBE7] text-[#111]">

      {/* Header */}
      <div className="bg-white border-b border-[#D8D5CF] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <div className="text-[9px] font-mono tracking-[0.4em] text-[#999] uppercase">Performance Meals · UX Blueprint · October 2026</div>
          <div className="font-bold text-[18px] mt-0.5">Wireframes <span className="text-[#999] font-normal text-[14px]">— {SCREENS.length} screens</span></div>
        </div>
        <div className="flex gap-2">
          {active && (
            <button onClick={() => setActive(null)}
              className="border border-[#D8D5CF] px-4 py-2 text-[11px] tracking-[0.15em] uppercase text-[#666] hover:border-[#111] transition-colors">
              ← All Screens
            </button>
          )}
          <button onClick={() => navigate("home")}
            className="bg-[#111] text-white px-4 py-2 text-[11px] tracking-[0.15em] uppercase hover:bg-[#CDFF3A] hover:text-[#111] transition-colors">
            View Live Prototype →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border-b border-[#D8D5CF] px-6 py-2 flex gap-5 text-[11px] text-[#888]">
        {[
          { color: "bg-[#C8C4BC]", label: "Image / Media" },
          { color: "bg-[#D8D5CF]", label: "Text / Label" },
          { color: "bg-[#555]", label: "Primary Button / Dark BG" },
          { color: "border border-[#C8C4BC] bg-[#EDEBE7]", label: "Input Field" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-sm ${l.color}`} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 border border-dashed border-[#C8C4BC] rounded-sm" />
          <span>Section Annotation</span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* Single screen expanded view */}
        {activeScreen && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-[22px]">{activeScreen.label}</h2>
                <p className="text-[13px] text-[#888] mt-0.5">Click "View Live Prototype" to see the designed version</p>
              </div>
              <button onClick={() => navigate(activeScreen.page)}
                className="border border-[#111] px-5 py-2.5 text-[11px] tracking-[0.15em] uppercase hover:bg-[#111] hover:text-white transition-colors">
                Open This Screen →
              </button>
            </div>
            <div className="bg-white border border-[#D8D5CF] rounded-sm p-6 max-w-[800px]">
              <activeScreen.WF />
            </div>
          </div>
        )}

        {/* Grid of all screens */}
        {!active && (
          <>
            <p className="text-[13px] text-[#888] mb-6">Click any screen to expand it. Each wireframe shows the layout structure and component hierarchy.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SCREENS.map(s => (
                <button key={s.id} onClick={() => setActive(s.id)}
                  className="text-left bg-white border border-[#D8D5CF] hover:border-[#111] hover:shadow-md transition-all group rounded-sm overflow-hidden">
                  {/* Wireframe thumbnail */}
                  <div className="p-4 bg-[#F5F3EF] overflow-hidden" style={{ height: 240 }}>
                    <div className="scale-[0.52] origin-top-left" style={{ width: "192%", pointerEvents: "none" }}>
                      <s.WF />
                    </div>
                  </div>
                  {/* Label */}
                  <div className="px-4 py-3 border-t border-[#E5E2DA] flex items-center justify-between">
                    <div className="font-semibold text-[13px]">{s.label}</div>
                    <span className="text-[11px] text-[#999] group-hover:text-[#111] transition-colors">Expand →</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
