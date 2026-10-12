import { Page } from "@/data";
import { PerformanceMealsLogo } from "@/components/Logos";

interface FooterProps {
  navigate: (page: Page) => void;
  navigateToWizard: (plan?: string) => void;
}

export default function Footer({ navigate, navigateToWizard }: FooterProps) {
  return (
    <footer className="bg-[#1A1A1A] border-t border-white/5">
      {/* Main row */}
      <div className="max-w-[1440px] mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Brand */}
        <button onClick={() => navigate("home")} className="shrink-0">
          <PerformanceMealsLogo size="sm" variant="light" />
        </button>

        {/* Nav links */}
        <nav className="flex flex-wrap gap-x-7 gap-y-2">
          {[
            { label: "Ready Series", action: () => navigate("ready-series") },
            { label: "Meal Plans", action: () => navigate("meal-plan-landing") },
            { label: "Gift Cards", action: () => navigate("gift-card") },
            { label: "About Us", action: () => navigate("about") },
          ].map((l) => (
            <button key={l.label} onClick={l.action}
              className="text-[11px] sm:text-[12px] text-white/60 hover:text-[#F5B300] transition-colors tracking-wide whitespace-nowrap">
              {l.label}
            </button>
          ))}
        </nav>

        {/* Contact micro */}
        <div className="text-[11px] text-white/30 text-right shrink-0 hidden lg:block">
          <div>hello@performancemeals.com.sg</div>
          <div className="mt-0.5">+65 6123 4567 · Toa Payoh, SG</div>
        </div>
      </div>

      {/* Legal row */}
      <div className="border-t border-white/5">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/30">
          <span>© 2026 Performance Meals Pte. Ltd. · UEN 202512345A</span>
          <div className="flex gap-5 items-center">
            {["Privacy", "Terms", "Refunds"].map((l) => (
              <a key={l} href="#" className="hover:text-white/70 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>

      {/* Prototype-only tools — developer/QA navigation */}
      <div className="border-t border-white/[0.04] bg-white/[0.02]">
        <div className="max-w-[1440px] mx-auto px-6 py-2 flex flex-wrap gap-2 items-center justify-end">
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/15 mr-1">PROTOTYPE</span>
          {[
            { label: "Wireframes", action: () => navigate("wireframe") },
            { label: "Blueprint",  action: () => navigate("blueprint") },
            { label: "QA Handoff", action: () => navigate("handoff") },
            { label: "Screens", action: () => navigate("screens-export") },
          ].map(({ label, action }) => (
            <button key={label} onClick={action}
              className="border border-white/10 px-2.5 py-0.5 text-[9px] tracking-[0.12em] uppercase text-white/20 hover:text-white/40 hover:border-white/20 transition-colors font-mono">
              {label}
            </button>
          ))}
          <a href="/performance-meals-prototype.html" download="performance-meals-prototype.html"
            className="border border-white/10 px-2.5 py-0.5 text-[9px] tracking-[0.12em] uppercase text-white/20 hover:text-white/40 hover:border-white/20 transition-colors font-mono">
            ↓ HTML Export
          </a>
          <a href="/PerformanceMeals-Shopify-Theme.zip" download="PerformanceMeals-Shopify-Theme.zip"
            className="border border-white/10 px-2.5 py-0.5 text-[9px] tracking-[0.12em] uppercase text-white/20 hover:text-white/40 hover:border-white/20 transition-colors font-mono">
            Shopify Theme
          </a>
          <a href="/performance-meals-figma-make.tar.gz" download="performance-meals-figma-make.tar.gz"
            className="border border-[#f5b800]/30 px-2.5 py-0.5 text-[9px] tracking-[0.12em] uppercase text-[#f5b800]/40 hover:text-[#f5b800]/70 hover:border-[#f5b800]/50 transition-colors font-mono">
            ↓ Source
          </a>
        </div>
      </div>
    </footer>
  );
}
