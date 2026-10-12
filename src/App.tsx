import { useState, useEffect } from "react";
import { CartItem, Page } from "@/data";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PromoPopup from "@/components/PromoPopup";
import HomePage from "@/pages/HomePage";
import ReadySeriesPage from "@/pages/ReadySeriesPage";
import MealPlanLandingPage from "@/pages/MealPlanLandingPage";
import MealPlanWizardPage from "@/pages/MealPlanWizardPage";
import CheckoutPage from "@/pages/CheckoutPage";
import ConfirmationPage from "@/pages/ConfirmationPage";
import AccountPage from "@/pages/AccountPage";
import GiftCardPage from "@/pages/GiftCardPage";
import HandoffPage from "@/pages/HandoffPage";
import BlueprintPage from "@/pages/BlueprintPage";
import WireframePage from "@/pages/WireframePage";
import AboutPage from "@/pages/AboutPage";
import ScreensExportPage from "@/pages/ScreensExportPage";
import ReadySeriesProductPage from "@/pages/ReadySeriesProductPage";
import RewardsPage from "@/pages/RewardsPage";

const NO_FOOTER_PAGES: Page[] = ["checkout", "confirmation", "meal-plan-wizard", "handoff", "blueprint", "wireframe", "screens-export", "ready-series-product"];

export interface SavedAddress {
  name: string;
  phone: string;
  line1: string;
  unit: string;
  postal: string;
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wizardInitialPlan, setWizardInitialPlan] = useState("MAINTAIN");
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);
  const [lastOrderType, setLastOrderType] = useState<"ready" | "plan">("ready");
  const [lastOrderGuest, setLastOrderGuest] = useState(false);
  const [lastPromoCode, setLastPromoCode] = useState("");
  const [lastPromoDiscount, setLastPromoDiscount] = useState(0);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastOrderDetails, setLastOrderDetails] = useState<{ name: string; address: string; date: string; slot: string; deliveryFee: number } | null>(null);
  const [selectedMealId, setSelectedMealId] = useState<number>(1);
  const [accountInitialTab, setAccountInitialTab] = useState<"dashboard" | "settings">("dashboard");
  const [accountInitialSection, setAccountInitialSection] = useState<string | undefined>(undefined);
  const [showPromo, setShowPromo] = useState(false);
  const [checkoutIsSubscription, setCheckoutIsSubscription] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPromo(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (p === "home") setTimeout(() => setShowPromo(true), 1800);
  };

  const navigateToAccountReferral = () => {
    setAccountInitialTab("settings");
    setAccountInitialSection("referral");
    navigate("account");
  };

  const navigateToWizard = (plan?: string) => {
    if (plan) setWizardInitialPlan(plan);
    navigate("meal-plan-wizard");
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const key = `${item.id}-${item.type}`;
      const existing = prev.find((i) => `${i.id}-${i.type}` === key);
      if (existing) return prev.map((i) => `${i.id}-${i.type}` === key ? { ...i, qty: i.qty + item.qty } : i);
      return [...prev, item];
    });
    setCartOpen(true);
  };

  const updateCartQty = (id: number, type: string, delta: number) => {
    setCart((prev) => {
      const key = `${id}-${type}`;
      return prev
        .map((i) => `${i.id}-${i.type}` === key ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0);
    });
  };

  const removeFromCart = (id: number, type: string) => {
    setCart((prev) => prev.filter((i) => !(i.id === id && i.type === type)));
  };

  const handlePlanCheckout = (addr: SavedAddress, total: number) => {
    setSavedAddress(addr);
    setLastOrderType("plan");
    setLastOrderTotal(total);
    setLastOrderGuest(false);
    setLastPromoCode("");
    setLastPromoDiscount(0);
    setLastOrderDetails({ name: addr.name, address: `${addr.line1}${addr.unit ? `, ${addr.unit}` : ""}, S${addr.postal}`, date: "Next available", slot: "6am – 9am", deliveryFee: 0 });
  };

  const handleReadyCheckout = () => {
    setLastOrderType("ready");
    navigate("checkout");
  };

  const showFooter = !NO_FOOTER_PAGES.includes(page);

  return (
    <div className="min-h-screen font-body">
      {showPromo && <PromoPopup onClose={() => setShowPromo(false)} navigate={navigate} navigateToWizard={navigateToWizard} />}

      {/* Download banner */}
      <div className="bg-[#1A1A1A] text-white flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
        <div>
          <div className="text-[13px] font-semibold text-white">Download Prototype</div>
          <div className="text-[11px] text-white/50">Single HTML file — open in any browser, no setup needed</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/Performance-Meals-Complete-Prototype-Screens.pdf"
            download="Performance-Meals-Complete-Prototype-Screens.pdf"
            className="border border-[#F5B300] text-[#F5B300] text-[12px] font-bold tracking-[0.15em] uppercase px-5 py-2.5 hover:bg-[#F5B300] hover:text-[#1A1A1A] transition-colors whitespace-nowrap shrink-0"
          >
            ↓ Download Screens PDF
          </a>
          <a
            href="/performance-meals-prototype.html"
            download="performance-meals-prototype.html"
            className="bg-[#F5B300] text-[#1A1A1A] text-[12px] font-bold tracking-[0.15em] uppercase px-5 py-2.5 hover:bg-white transition-colors whitespace-nowrap shrink-0">
            ↓ Download performance-meals-prototype.html
          </a>
        </div>
      </div>

      <Nav
        currentPage={page}
        navigate={navigate}
        navigateToWizard={navigateToWizard}
        cart={cart}
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        updateCartQty={updateCartQty}
        removeFromCart={removeFromCart}
        onCheckout={handleReadyCheckout}
      />

      {page === "home" && <HomePage navigate={navigate} navigateToWizard={navigateToWizard} />}
      {page === "ready-series" && <ReadySeriesPage navigate={navigate} addToCart={addToCart} cart={cart} onSelectMeal={(id) => { setSelectedMealId(id); navigate("ready-series-product"); }} setCartOpen={setCartOpen} />}
      {page === "ready-series-product" && <ReadySeriesProductPage mealId={selectedMealId} navigate={navigate} addToCart={addToCart} />}
      {page === "meal-plan-landing" && <MealPlanLandingPage navigate={navigate} navigateToWizard={navigateToWizard} />}
      {page === "meal-plan-wizard" && (
        <MealPlanWizardPage
          navigate={navigate}
          addToCart={addToCart}
          initialPlan={wizardInitialPlan}
          onCheckoutComplete={(addr, total) => { handlePlanCheckout(addr, total); navigate("confirmation"); }}
        />
      )}
      {page === "checkout" && <CheckoutPage navigate={navigate} cart={cart} savedAddress={savedAddress} requireAccount={checkoutIsSubscription} onComplete={(isGuest, promoCode, promoDiscount, total, details) => { setLastOrderType("ready"); setLastOrderGuest(isGuest); setLastPromoCode(promoCode); setLastPromoDiscount(promoDiscount); setLastOrderTotal(total); setLastOrderDetails(details); navigate("confirmation"); }} />}
      {page === "confirmation" && <ConfirmationPage navigate={navigate} orderType={lastOrderType} isGuest={lastOrderGuest} promoCode={lastPromoCode} promoDiscount={lastPromoDiscount} orderTotal={lastOrderTotal} orderDetails={lastOrderDetails} />}
      {page === "account" && <AccountPage navigate={navigate} initialTab={accountInitialTab} initialSection={accountInitialSection} />}
      {page === "gift-card" && <GiftCardPage navigate={navigate} />}
      {page === "handoff" && <HandoffPage navigate={navigate} navigateToWizard={navigateToWizard} />}
      {page === "blueprint" && <BlueprintPage navigate={navigate} navigateToWizard={navigateToWizard} />}
      {page === "screens-export" && <ScreensExportPage navigate={navigate} />}
      {page === "wireframe" && <WireframePage navigate={navigate} navigateToWizard={navigateToWizard} />}
      {page === "about" && <AboutPage navigate={navigate} navigateToWizard={navigateToWizard} />}
      {page === "rewards" && <RewardsPage navigate={navigate} />}

      {showFooter && <Footer navigate={navigate} navigateToWizard={navigateToWizard} />}

      {/* Floating support chat button — fixed bottom-right on all pages */}
      <FloatingChat />
    </div>
  );
}

const WA_NUMBER = "6512345678";
const WA_MESSAGE = "Hi Performance Meals! I have a question about ";

function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);

  const openWhatsApp = (msg: string) => {
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE + msg)}`;
    window.open(url, "_blank", "noopener");
  };

  const quickTopics = [
    { label: "Track my order", msg: "my order status" },
    { label: "Meal Plan info", msg: "the Meal Plan subscription" },
    { label: "Ready Series", msg: "Ready Series products" },
    { label: "Delivery help", msg: "delivery to my area" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      {open && (
        <div className="bg-white border border-[#E8E4DC] w-[300px] sm:w-[340px] overflow-hidden"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}>
          {/* WhatsApp header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: "#075E54" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M11.99 2C6.476 2 2 6.476 2 11.99c0 1.77.463 3.433 1.27 4.88L2 22l5.287-1.384A9.942 9.942 0 0011.99 22c5.514 0 9.99-4.476 9.99-9.99S17.504 2 11.99 2zm0 18.18a8.17 8.17 0 01-4.164-1.135l-.299-.178-3.138.822.836-3.053-.194-.312A8.183 8.183 0 013.82 11.99 8.17 8.17 0 0111.99 3.82 8.17 8.17 0 0120.16 11.99a8.17 8.17 0 01-8.17 8.19z"/>
                </svg>
              </div>
              <div>
                <div className="text-white text-[13px] font-semibold">Performance Meals</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-[#25D366]" />
                  <span className="text-white/70 text-[10px]">WhatsApp · Replies within minutes</span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Body */}
          <div className="bg-[#ECE5DD] px-5 py-5">
            <div className="bg-white px-4 py-3 max-w-[240px] shadow-sm mb-2" style={{ borderRadius: "0 8px 8px 8px" }}>
              <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
                Hi there! 👋 We're here to help with anything — orders, plans, delivery, or nutrition questions.
              </p>
              <p className="text-[10px] text-[#999] mt-1.5 text-right">09:00</p>
            </div>
            <div className="bg-white px-4 py-3 max-w-[240px] shadow-sm" style={{ borderRadius: "0 8px 8px 8px" }}>
              <p className="text-[13px] text-[#1A1A1A] leading-relaxed">What can we help you with today?</p>
              <p className="text-[10px] text-[#999] mt-1.5 text-right">09:00</p>
            </div>
          </div>

          {/* Quick topic buttons */}
          <div className="px-5 py-4 bg-white border-t border-[#E8E4DC]">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#aaa] mb-3">Quick topics</p>
            <div className="flex flex-col gap-2">
              {quickTopics.map((qt) => (
                <button key={qt.label}
                  onClick={() => { setTopic(qt.label); openWhatsApp(qt.msg); }}
                  className={`w-full text-left px-3 py-2.5 border text-[12px] font-medium transition-all flex items-center justify-between ${topic === qt.label ? "border-[#25D366] bg-[#25D366]/5 text-[#075E54]" : "border-[#E8E4DC] text-[#333] hover:border-[#25D366]"}`}>
                  {qt.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
            <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-3 text-white text-[12px] font-bold tracking-[0.1em] uppercase transition-colors"
              style={{ backgroundColor: "#25D366" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.99 2C6.476 2 2 6.476 2 11.99c0 1.77.463 3.433 1.27 4.88L2 22l5.287-1.384A9.942 9.942 0 0011.99 22c5.514 0 9.99-4.476 9.99-9.99S17.504 2 11.99 2zm0 18.18a8.17 8.17 0 01-4.164-1.135l-.299-.178-3.138.822.836-3.053-.194-.312A8.183 8.183 0 013.82 11.99 8.17 8.17 0 0111.99 3.82 8.17 8.17 0 0120.16 11.99a8.17 8.17 0 01-8.17 8.19z"/>
              </svg>
              Open in WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 flex items-center justify-center transition-colors group"
        style={{
          backgroundColor: open ? "#1A1A1A" : "#25D366",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}
        aria-label="Open WhatsApp support"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M11.99 2C6.476 2 2 6.476 2 11.99c0 1.77.463 3.433 1.27 4.88L2 22l5.287-1.384A9.942 9.942 0 0011.99 22c5.514 0 9.99-4.476 9.99-9.99S17.504 2 11.99 2zm0 18.18a8.17 8.17 0 01-4.164-1.135l-.299-.178-3.138.822.836-3.053-.194-.312A8.183 8.183 0 013.82 11.99 8.17 8.17 0 0111.99 3.82 8.17 8.17 0 0120.16 11.99a8.17 8.17 0 01-8.17 8.19z"/>
          </svg>
        )}
      </button>
    </div>
  );
}
