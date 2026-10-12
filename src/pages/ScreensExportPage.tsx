import { Page } from "@/data";

interface Props {
  navigate: (page: Page) => void;
}

export default function ScreensExportPage({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center gap-8 px-6">
      {/* Back */}
      <button onClick={() => navigate("home")}
        className="absolute top-6 left-6 text-white/40 hover:text-white text-[12px] tracking-widest uppercase transition-colors">
        ← Back to App
      </button>

      {/* Hero */}
      <div className="text-center max-w-md">
        <div className="inline-block bg-[#CDFF3A] text-[#111] text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1 mb-6">
          PDF Export
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">
          All 47 UI States<span className="text-[#CDFF3A]">.</span>
        </h1>
        <p className="text-white/40 text-[14px] leading-relaxed mb-8">
          Current 49-page screen inventory — cover, index, every customer-facing page, modal, dropdown, theme, subscription gate, checkout state, and account view.
        </p>

        <a
          href="/Performance-Meals-Complete-Prototype-Screens.pdf"
          download="Performance-Meals-Complete-Prototype-Screens.pdf"
          className="block bg-[#CDFF3A] text-[#111] font-bold text-[13px] tracking-[0.15em] uppercase px-10 py-4 hover:bg-white transition-colors w-full"
        >
          ↓ Download Current Screens PDF
        </a>
      </div>

      {/* Contents list */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 p-6">
        <p className="text-[10px] font-bold text-white/30 tracking-[0.15em] uppercase mb-4">What's inside</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["01–08", "Home + global overlays"],
            ["09–18", "Ready Series + themes"],
            ["19–24", "Ready-to-Go + Build-A-Box"],
            ["25–30", "Meal Plan + wizard"],
            ["31–34", "Checkout + confirmation"],
            ["35–43", "Account + management states"],
            ["44–47", "Education + brand pages"],
            ["PDF", "49 pages including cover + index"],
          ].map(([n, t]) => (
            <div key={n} className="flex items-center gap-2">
              <span className="bg-[#CDFF3A] text-[#111] text-[8px] font-bold px-1.5 py-0.5 shrink-0 min-w-[28px] text-center">{n}</span>
              <span className="text-white/50 text-[10px]">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
