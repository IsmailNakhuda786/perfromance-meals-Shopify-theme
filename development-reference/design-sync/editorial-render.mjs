// <stdin>
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ../../../../2026-10-08/referenced-chatgpt-conversation-this-is-an/work/approved-source/src/components/Logos.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function MealPlanLogo({
  size = "md",
  variant = "light",
  className = ""
}) {
  const scales = { sm: 0.65, md: 1, lg: 1.3 };
  const s = scales[size];
  const textColor = variant === "dark" ? "#FFFFFF" : "#1A1A1A";
  const orange = "#E85D04";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `inline-flex items-start gap-[10px] select-none ${className}`,
      style: { transform: `scale(${s})`, transformOrigin: "left center" },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "shrink-0 mt-[3px]",
            style: {
              width: "4px",
              backgroundColor: orange,
              alignSelf: "stretch",
              minHeight: "38px"
            }
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col leading-none", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              style: {
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: "8px",
                letterSpacing: "0.25em",
                color: orange,
                lineHeight: 1,
                marginBottom: "4px"
              },
              children: "PERFORMANCE MEALS"
            }
          ),
          /* @__PURE__ */ jsx(
            "span",
            {
              style: {
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontStyle: "italic",
                fontSize: "34px",
                letterSpacing: "0.01em",
                color: textColor,
                lineHeight: 0.88
              },
              children: "MEAL PLAN"
            }
          ),
          /* @__PURE__ */ jsx(
            "svg",
            {
              width: "130",
              height: "7",
              viewBox: "0 0 130 7",
              style: { marginTop: "4px" },
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  d: "M2 4.5 C25 2, 65 5.5, 95 3.5 C112 2.5, 124 4, 128 4.5",
                  stroke: orange,
                  strokeWidth: "3.5",
                  fill: "none",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  opacity: "0.9"
                }
              )
            }
          )
        ] })
      ]
    }
  );
}
function ReadySeriesLogo({
  size = "md",
  variant = "dark",
  className = ""
}) {
  const scales = { sm: 0.65, md: 1, lg: 1.3 };
  const s = scales[size];
  const textColor = variant === "light" ? "#1A1A1A" : variant === "yellow" ? "#1A1A1A" : "#FFFFFF";
  const circleColor = variant === "yellow" ? "#1A1A1A" : "#F5B300";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `inline-flex items-center gap-[11px] select-none ${className}`,
      style: { transform: `scale(${s})`, transformOrigin: "left center" },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "shrink-0 w-[36px] h-[36px] rounded-full",
            style: { backgroundColor: circleColor }
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col leading-none", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              style: {
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontStyle: "italic",
                fontSize: "22px",
                letterSpacing: "0.02em",
                color: textColor,
                lineHeight: 1
              },
              children: "READY-SERIES"
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                height: "2px",
                backgroundColor: "#F5B300",
                marginTop: "3px",
                marginBottom: "3px"
              }
            }
          ),
          /* @__PURE__ */ jsx(
            "span",
            {
              style: {
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                fontSize: "7.5px",
                letterSpacing: "0.22em",
                color: textColor,
                opacity: 0.55,
                lineHeight: 1
              },
              children: "by PERFORMANCE MEALS"
            }
          )
        ] })
      ]
    }
  );
}

// ../../../../2026-10-08/referenced-chatgpt-conversation-this-is-an/work/approved-source/src/pages/ReadySeriesLandingPage.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function ReadySeriesLandingPage({
  navigate: navigate2,
  navigateToReadyOrder: navigateToReadyOrder2
}) {
  return /* @__PURE__ */ jsxs2("div", { className: "min-h-screen bg-[#F7F2E8] text-[#1A1A1A]", children: [
    /* @__PURE__ */ jsx2("section", { className: "relative overflow-hidden bg-[#1A1A1A] text-white", children: /* @__PURE__ */ jsxs2("div", { className: "max-w-[1440px] mx-auto grid lg:grid-cols-[0.9fr_1.1fr] min-h-[740px]", children: [
      /* @__PURE__ */ jsxs2("div", { className: "relative z-10 px-6 sm:px-10 lg:px-16 py-16 lg:py-20 flex flex-col", children: [
        /* @__PURE__ */ jsx2(ReadySeriesLogo, { size: "md", variant: "dark" }),
        /* @__PURE__ */ jsxs2("div", { className: "mt-auto pt-20 max-w-[650px]", children: [
          /* @__PURE__ */ jsxs2("div", { className: "inline-flex items-center gap-3 bg-[#F5B300] text-[#1A1A1A] rounded-full px-4 py-2 mb-7", children: [
            /* @__PURE__ */ jsx2("span", { className: "w-2 h-2 bg-[#1A1A1A] rounded-full" }),
            /* @__PURE__ */ jsx2("span", { className: "text-[9px] font-extrabold tracking-[0.2em] uppercase", children: "Everyday momentum" })
          ] }),
          /* @__PURE__ */ jsxs2("h1", { className: "font-display text-[52px] sm:text-[72px] lg:text-[84px] font-black leading-[0.86] tracking-[-0.045em]", children: [
            "Ready for",
            /* @__PURE__ */ jsx2("br", {}),
            /* @__PURE__ */ jsx2("span", { className: "text-[#F5B300]", children: "real life." })
          ] }),
          /* @__PURE__ */ jsx2("p", { className: "text-white/70 text-[17px] sm:text-[19px] leading-relaxed max-w-[560px] mt-8", children: "Frozen performance meals that keep your week moving. Easy to choose, ready in minutes, and dependable when cooking does not fit the day." }),
          /* @__PURE__ */ jsxs2("div", { className: "flex flex-col sm:flex-row gap-3 mt-9", children: [
            /* @__PURE__ */ jsxs2(
              "button",
              {
                "data-native-href": navigateToReadyOrder2("single"),
                className: "group inline-flex items-center justify-between gap-8 rounded-full bg-[#F5B300] text-[#1A1A1A] pl-7 pr-2 py-2 text-[11px] font-extrabold tracking-[0.16em] uppercase hover:bg-white transition-colors",
                children: [
                  "Shop Ready Series",
                  /* @__PURE__ */ jsx2("span", { className: "w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform", children: /* @__PURE__ */ jsx2(
                    "svg",
                    {
                      width: "16",
                      height: "16",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2.5",
                      children: /* @__PURE__ */ jsx2("path", { d: "M5 12h14M13 6l6 6-6 6" })
                    }
                  ) })
                ]
              }
            ),
            /* @__PURE__ */ jsx2(
              "button",
              {
                "data-native-href": navigateToReadyOrder2("subscription"),
                className: "rounded-full border border-white/25 px-7 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-white hover:text-[#1A1A1A] transition-colors",
                children: "See subscription plans"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "relative min-h-[560px] lg:min-h-full overflow-hidden", children: [
        /* @__PURE__ */ jsx2(
          "img",
          {
            src: "https://images.unsplash.com/photo-1576089073624-b5751a8f4de9?w=1400&h=1200&fit=crop&auto=format&q=85",
            alt: "Asian family enjoying a meal together at home",
            className: "absolute inset-0 w-full h-full object-cover object-center"
          }
        ),
        /* @__PURE__ */ jsx2("div", { className: "absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" }),
        /* @__PURE__ */ jsxs2("div", { className: "absolute top-6 right-6 bg-white text-[#1A1A1A] rounded-2xl px-5 py-4 shadow-xl", children: [
          /* @__PURE__ */ jsx2("div", { className: "text-[9px] font-bold tracking-[0.18em] uppercase text-[#897F74]", children: "From freezer to table" }),
          /* @__PURE__ */ jsx2("div", { className: "font-display text-[28px] font-black mt-1", children: "3 minutes" })
        ] }),
        /* @__PURE__ */ jsx2("div", { className: "absolute left-5 right-5 sm:left-8 sm:right-8 bottom-6 grid grid-cols-3 rounded-2xl overflow-hidden bg-white/92 backdrop-blur-md text-[#1A1A1A] shadow-2xl", children: [
          ["Zero prep", "No chopping"],
          ["Clear macros", "Choose easily"],
          ["Stock-up value", "Stay ready"]
        ].map(([title, copy]) => /* @__PURE__ */ jsxs2(
          "div",
          {
            className: "px-3 sm:px-5 py-5 border-r border-[#D7D0C6] last:border-0",
            children: [
              /* @__PURE__ */ jsx2("div", { className: "font-display text-[13px] sm:text-[16px] font-extrabold", children: title }),
              /* @__PURE__ */ jsx2("div", { className: "text-[#7B7167] text-[9px] sm:text-[10px] mt-1", children: copy })
            ]
          },
          title
        )) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx2("section", { className: "px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs2("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs2("div", { className: "grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20 items-end mb-12", children: [
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsx2("p", { className: "text-[#806A2A] text-[10px] font-bold tracking-[0.24em] uppercase mb-5", children: "When the day changes" }),
          /* @__PURE__ */ jsxs2("h2", { className: "font-display text-[42px] sm:text-[58px] font-black leading-[0.93] tracking-[-0.035em]", children: [
            "Cooking can wait.",
            /* @__PURE__ */ jsx2("br", {}),
            "Your routine should not."
          ] })
        ] }),
        /* @__PURE__ */ jsx2("p", { className: "text-[#6F665D] text-[16px] leading-relaxed max-w-[540px] lg:justify-self-end", children: "Long workdays, late training, family plans, and low-energy evenings are normal. Ready Series gives those moments a better answer than skipping dinner or ordering whatever is closest." })
      ] }),
      /* @__PURE__ */ jsx2("div", { className: "grid md:grid-cols-3 gap-4", children: [
        [
          "7:15 PM",
          "The meeting ran over",
          "Dinner is already handled. Heat a meal and close the laptop."
        ],
        [
          "8:30 PM",
          "Training finished late",
          "Clear protein and calorie information makes the next choice easy."
        ],
        [
          "Any time",
          "Plans changed again",
          "A stocked freezer keeps one useful part of the day predictable."
        ]
      ].map(([time, title, copy]) => /* @__PURE__ */ jsxs2(
        "article",
        {
          className: "bg-white border border-[#DED7CD] rounded-2xl p-7 min-h-[260px] flex flex-col hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(52,42,30,0.09)] transition-all duration-300",
          children: [
            /* @__PURE__ */ jsx2("span", { className: "font-mono text-[10px] text-[#A87500]", children: time }),
            /* @__PURE__ */ jsxs2("div", { className: "mt-auto", children: [
              /* @__PURE__ */ jsx2("h3", { className: "font-display text-[23px] font-extrabold", children: title }),
              /* @__PURE__ */ jsx2("p", { className: "text-[#71685F] text-[13px] leading-relaxed mt-3", children: copy })
            ] })
          ]
        },
        title
      )) })
    ] }) }),
    /* @__PURE__ */ jsx2("section", { className: "bg-white px-6 sm:px-10 py-20 sm:py-24 border-y border-[#DED7CD]", children: /* @__PURE__ */ jsxs2("div", { className: "max-w-[1280px] mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center", children: [
      /* @__PURE__ */ jsxs2("div", { className: "relative overflow-hidden rounded-2xl min-h-[420px]", children: [
        /* @__PURE__ */ jsx2(
          "img",
          {
            src: "https://images.unsplash.com/photo-1666819691716-827f78d892f3?w=1200&h=900&fit=crop&auto=format&q=85",
            alt: "A selection of balanced Ready Series meals",
            className: "absolute inset-0 w-full h-full object-cover"
          }
        ),
        /* @__PURE__ */ jsx2("div", { className: "absolute top-5 left-5 bg-[#F5B300] rounded-full px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.18em]", children: "Frozen at peak" })
      ] }),
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("p", { className: "text-[#806A2A] text-[10px] font-bold tracking-[0.24em] uppercase mb-5", children: "The simplest part of your day" }),
        /* @__PURE__ */ jsx2("h2", { className: "font-display text-[42px] sm:text-[54px] font-black leading-[0.94] tracking-[-0.035em]", children: "Choose. Heat. Keep moving." }),
        /* @__PURE__ */ jsx2("div", { className: "mt-9 space-y-6", children: [
          [
            "01",
            "Choose what fits",
            "Browse individual meals, predefined bundles, or a recurring subscription."
          ],
          [
            "02",
            "Keep it ready",
            "Store meals in the freezer for the unpredictable days ahead."
          ],
          [
            "03",
            "Heat in minutes",
            "Follow the clear preparation guidance and get back to your evening."
          ]
        ].map(([number, title, copy]) => /* @__PURE__ */ jsxs2(
          "div",
          {
            className: "grid grid-cols-[42px_1fr] gap-4 border-t border-[#DED7CD] pt-5",
            children: [
              /* @__PURE__ */ jsx2("span", { className: "font-mono text-[10px] text-[#A87500] pt-1", children: number }),
              /* @__PURE__ */ jsxs2("div", { children: [
                /* @__PURE__ */ jsx2("h3", { className: "font-display text-[19px] font-extrabold", children: title }),
                /* @__PURE__ */ jsx2("p", { className: "text-[#71685F] text-[13px] leading-relaxed mt-1", children: copy })
              ] })
            ]
          },
          number
        )) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx2("section", { className: "bg-[#F5B300] px-6 sm:px-10 py-20 sm:py-24 overflow-hidden", children: /* @__PURE__ */ jsxs2("div", { className: "max-w-[1280px] mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-center", children: [
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("div", { className: "inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] text-white px-4 py-2 text-[9px] font-extrabold tracking-[0.18em] uppercase", children: "Ready Series subscription" }),
        /* @__PURE__ */ jsxs2("h2", { className: "font-display text-[48px] sm:text-[66px] font-black leading-[0.88] tracking-[-0.045em] mt-7", children: [
          "Stock up once.",
          /* @__PURE__ */ jsx2("br", {}),
          "Stay ready for months."
        ] }),
        /* @__PURE__ */ jsx2("p", { className: "text-black/65 text-[16px] leading-relaxed max-w-[560px] mt-7", children: "Choose from 10 predefined plans across Just Protein, Low Carb, High Carb, and Mixed. Select a 3- or 6-month term and receive one planned delivery each month." }),
        /* @__PURE__ */ jsxs2(
          "button",
          {
            "data-native-href": navigateToReadyOrder2("subscription"),
            className: "group mt-9 inline-flex items-center gap-7 rounded-full bg-[#1A1A1A] text-white pl-7 pr-2 py-2 text-[11px] font-extrabold tracking-[0.15em] uppercase hover:bg-white hover:text-[#1A1A1A] transition-colors",
            children: [
              "Compare subscription plans",
              /* @__PURE__ */ jsx2("span", { className: "w-10 h-10 rounded-full bg-white text-[#1A1A1A] flex items-center justify-center group-hover:bg-[#F5B300] group-hover:translate-x-1 transition-all", children: /* @__PURE__ */ jsx2(
                "svg",
                {
                  width: "16",
                  height: "16",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.5",
                  children: /* @__PURE__ */ jsx2("path", { d: "M5 12h14M13 6l6 6-6 6" })
                }
              ) })
            ]
          }
        ),
        /* @__PURE__ */ jsx2("p", { className: "text-black/45 text-[10px] mt-4", children: "Subscriptions require a shared Performance Meals account." })
      ] }),
      /* @__PURE__ */ jsx2("div", { className: "grid sm:grid-cols-2 gap-4", children: [
        ["10", "predefined plans"],
        ["3 or 6", "month terms"],
        ["1", "delivery each month"],
        ["Free", "subscription delivery"]
      ].map(([value, label], index) => /* @__PURE__ */ jsxs2(
        "div",
        {
          className: `rounded-2xl p-7 min-h-[190px] flex flex-col justify-between ${index === 0 ? "bg-[#1A1A1A] text-white" : "bg-white/80 text-[#1A1A1A]"}`,
          children: [
            /* @__PURE__ */ jsxs2("span", { className: "font-mono text-[10px] opacity-45", children: [
              "0",
              index + 1
            ] }),
            /* @__PURE__ */ jsxs2("div", { children: [
              /* @__PURE__ */ jsx2("div", { className: "font-display text-[38px] font-black leading-none", children: value }),
              /* @__PURE__ */ jsx2("div", { className: "text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60 mt-2", children: label })
            ] })
          ]
        },
        label
      )) })
    ] }) }),
    /* @__PURE__ */ jsx2("section", { className: "px-6 sm:px-10 py-20 sm:py-24 bg-[#F7F2E8]", children: /* @__PURE__ */ jsxs2("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs2("div", { className: "text-center max-w-[720px] mx-auto mb-12", children: [
        /* @__PURE__ */ jsx2("p", { className: "text-[#806A2A] text-[10px] font-bold tracking-[0.24em] uppercase mb-5", children: "Start where you are" }),
        /* @__PURE__ */ jsx2("h2", { className: "font-display text-[42px] sm:text-[56px] font-black leading-[0.94] tracking-[-0.035em]", children: "Three clear ways to stay ready." })
      ] }),
      /* @__PURE__ */ jsx2("div", { className: "grid md:grid-cols-3 gap-4", children: [
        {
          mode: "single",
          number: "01",
          title: "Individual Selection",
          copy: "Pick the meals you want for a flexible one-time order.",
          action: "Choose meals"
        },
        {
          mode: "bundles",
          number: "02",
          title: "Bundles",
          copy: "Stock up with a predefined selection and clear one-time pricing.",
          action: "See bundles"
        },
        {
          mode: "subscription",
          number: "03",
          title: "Subscription",
          copy: "Choose a predefined plan for 3 or 6 months and keep the freezer ready.",
          action: "Compare plans"
        }
      ].map((card) => /* @__PURE__ */ jsxs2(
        "button",
        {
          "data-native-href": navigateToReadyOrder2(card.mode),
          className: "group text-left bg-white border border-[#DED7CD] rounded-2xl p-7 min-h-[320px] flex flex-col hover:bg-[#1A1A1A] hover:text-white hover:-translate-y-1 transition-all duration-300",
          children: [
            /* @__PURE__ */ jsx2("span", { className: "font-mono text-[10px] text-[#A87500] group-hover:text-[#F5B300]", children: card.number }),
            /* @__PURE__ */ jsxs2("div", { className: "mt-auto", children: [
              /* @__PURE__ */ jsx2("h3", { className: "font-display text-[25px] font-extrabold", children: card.title }),
              /* @__PURE__ */ jsx2("p", { className: "text-[#71685F] group-hover:text-white/55 text-[13px] leading-relaxed mt-3", children: card.copy }),
              /* @__PURE__ */ jsxs2("div", { className: "text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#906700] group-hover:text-[#F5B300] mt-8", children: [
                card.action,
                " \u2192"
              ] })
            ] })
          ]
        },
        card.mode
      )) })
    ] }) }),
    /* @__PURE__ */ jsx2("section", { className: "bg-[#1A1A1A] text-white px-6 py-20 sm:py-24 text-center", children: /* @__PURE__ */ jsxs2("div", { className: "max-w-[850px] mx-auto", children: [
      /* @__PURE__ */ jsx2("p", { className: "text-[#F5B300] text-[10px] font-bold tracking-[0.25em] uppercase mb-6", children: "Stock up. Stay on track." }),
      /* @__PURE__ */ jsx2("h2", { className: "font-display text-[44px] sm:text-[64px] font-black leading-[0.9] tracking-[-0.04em]", children: "Put a better fallback in the freezer." }),
      /* @__PURE__ */ jsx2("p", { className: "text-white/55 text-[15px] leading-relaxed max-w-[560px] mx-auto mt-6", children: "Ready Series protects your routine when time is short\u2014without asking the rest of life to slow down." }),
      /* @__PURE__ */ jsxs2("div", { className: "flex flex-col sm:flex-row gap-3 justify-center mt-9", children: [
        /* @__PURE__ */ jsx2(
          "button",
          {
            "data-native-href": navigateToReadyOrder2("single"),
            className: "rounded-full bg-[#F5B300] text-[#1A1A1A] px-8 py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] hover:bg-white transition-colors",
            children: "Shop meals"
          }
        ),
        /* @__PURE__ */ jsx2(
          "button",
          {
            "data-native-href": navigate2("ready-series-about"),
            className: "rounded-full border border-white/25 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.16em] hover:border-white transition-colors",
            children: "Our story"
          }
        )
      ] })
    ] }) })
  ] });
}

// ../../../../2026-10-08/referenced-chatgpt-conversation-this-is-an/work/approved-source/src/pages/ReadySeriesAboutPage.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var familyImage = "https://images.unsplash.com/photo-1612698940563-143c627668e4?w=1600&h=1000&fit=crop&auto=format&q=85";
var closingFamilyImage = "https://images.unsplash.com/photo-1577896850561-dc005e5b5689?w=1600&h=1000&fit=crop&auto=format&q=85";
var kitchenImage = "https://images.unsplash.com/photo-1668838289210-e7665d947145?w=1200&h=900&fit=crop&auto=format&q=85";
var preparationImage = "https://images.unsplash.com/photo-1668838225765-daa3a5da6207?w=1200&h=900&fit=crop&auto=format&q=85";
function ReadySeriesAboutPage({ navigate: navigate2 }) {
  return /* @__PURE__ */ jsxs3("div", { className: "min-h-screen bg-[#F7F2E8] text-[#1A1A1A]", children: [
    /* @__PURE__ */ jsxs3("section", { className: "relative min-h-[760px] overflow-hidden flex items-end", children: [
      /* @__PURE__ */ jsx3(
        "img",
        {
          src: familyImage,
          alt: "Family sharing a meal together at home",
          className: "absolute inset-0 w-full h-full object-cover"
        }
      ),
      /* @__PURE__ */ jsx3("div", { className: "absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" }),
      /* @__PURE__ */ jsx3("div", { className: "absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" }),
      /* @__PURE__ */ jsx3("div", { className: "relative z-10 w-full max-w-[1280px] mx-auto px-6 sm:px-10 pb-16 sm:pb-24 pt-32", children: /* @__PURE__ */ jsxs3("div", { className: "max-w-[720px]", children: [
        /* @__PURE__ */ jsx3(ReadySeriesLogo, { size: "md", variant: "dark" }),
        /* @__PURE__ */ jsx3("p", { className: "text-[#F5B300] text-[10px] font-bold tracking-[0.28em] uppercase mt-14 mb-6", children: "Made for real life in Singapore" }),
        /* @__PURE__ */ jsx3("h1", { className: "font-display text-[48px] sm:text-[68px] lg:text-[82px] font-black leading-[0.9] tracking-[-0.045em] text-white", children: "More good days start with a meal that\u2019s ready." }),
        /* @__PURE__ */ jsx3("p", { className: "text-white/75 text-[17px] sm:text-[19px] leading-relaxed max-w-[620px] mt-7", children: "Ready Series exists for the late meeting, the school run, the training night, and every plan that changes. Proper food in the freezer means one less compromise when life gets full." }),
        /* @__PURE__ */ jsxs3(
          "button",
          {
            "data-native-href": navigate2("ready-series-order"),
            className: "group mt-9 inline-flex items-center gap-6 rounded-full bg-[#F5B300] text-[#1A1A1A] pl-7 pr-2 py-2 text-[11px] font-extrabold tracking-[0.16em] uppercase hover:bg-white transition-colors duration-300",
            children: [
              "Explore the meals",
              /* @__PURE__ */ jsx3("span", { className: "w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300", children: /* @__PURE__ */ jsx3(
                "svg",
                {
                  width: "16",
                  height: "16",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.5",
                  children: /* @__PURE__ */ jsx3("path", { d: "M5 12h14M13 6l6 6-6 6" })
                }
              ) })
            ]
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsx3("section", { className: "px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs3("div", { className: "max-w-[1280px] mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-24", children: [
      /* @__PURE__ */ jsxs3("div", { children: [
        /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-3 mb-6", children: [
          /* @__PURE__ */ jsx3("span", { className: "w-8 h-[2px] bg-[#F5B300]" }),
          /* @__PURE__ */ jsx3("p", { className: "text-[#806A2A] text-[10px] font-bold tracking-[0.24em] uppercase", children: "The Ready Series story" })
        ] }),
        /* @__PURE__ */ jsxs3("h2", { className: "font-display text-[42px] sm:text-[58px] font-black leading-[0.94] tracking-[-0.035em]", children: [
          "Life moves quickly.",
          /* @__PURE__ */ jsx3("br", {}),
          "Eating well should keep up."
        ] })
      ] }),
      /* @__PURE__ */ jsxs3("div", { className: "lg:pt-10", children: [
        /* @__PURE__ */ jsx3("p", { className: "text-[#4F4841] text-[18px] leading-relaxed", children: "Performance Meals began with a simple belief: busy people should not have to choose between food that supports them and food that fits their schedule." }),
        /* @__PURE__ */ jsx3("p", { className: "text-[#756B62] text-[15px] leading-relaxed mt-6", children: "Ready Series brings that belief into the everyday. It is the flexible side of our kitchen\u2014meals you can keep on hand, choose on your terms, and reach for without reorganising your entire week." }),
        /* @__PURE__ */ jsx3("div", { className: "grid sm:grid-cols-3 gap-px bg-[#D9D1C6] border border-[#D9D1C6] mt-10", children: [
          ["Minutes", "From freezer to table"],
          ["Your way", "Single, bundle, or subscription"],
          ["Always there", "A dependable meal at home"]
        ].map(([value, label]) => /* @__PURE__ */ jsxs3("div", { className: "bg-white px-5 py-6", children: [
          /* @__PURE__ */ jsx3("div", { className: "font-display text-[20px] font-extrabold", children: value }),
          /* @__PURE__ */ jsx3("div", { className: "text-[#81776D] text-[11px] leading-relaxed mt-1", children: label })
        ] }, value)) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx3("section", { className: "bg-[#1A1A1A] text-white px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs3("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs3("div", { className: "grid lg:grid-cols-2 gap-12 items-end mb-14", children: [
        /* @__PURE__ */ jsxs3("div", { children: [
          /* @__PURE__ */ jsx3("p", { className: "text-[#F5B300] text-[10px] font-bold tracking-[0.25em] uppercase mb-5", children: "From our kitchen to your freezer" }),
          /* @__PURE__ */ jsxs3("h2", { className: "font-display text-[42px] sm:text-[60px] font-black leading-[0.92] tracking-[-0.035em]", children: [
            "How Ready Series",
            /* @__PURE__ */ jsx3("br", {}),
            "comes together."
          ] })
        ] }),
        /* @__PURE__ */ jsx3("p", { className: "text-white/55 text-[16px] leading-relaxed max-w-[500px] lg:justify-self-end", children: "The format is convenient, but the thinking behind it is deliberate. Every stage is designed to make the final meal clear, dependable, and genuinely useful." })
      ] }),
      /* @__PURE__ */ jsxs3("div", { className: "grid sm:grid-cols-2 gap-5 mb-12", children: [
        /* @__PURE__ */ jsx3(
          "img",
          {
            src: kitchenImage,
            alt: "Food being prepared in a professional kitchen",
            className: "w-full aspect-[4/3] object-cover rounded-2xl"
          }
        ),
        /* @__PURE__ */ jsx3(
          "img",
          {
            src: preparationImage,
            alt: "Prepared meals moving through a professional kitchen",
            className: "w-full aspect-[4/3] object-cover rounded-2xl"
          }
        ),
        /* @__PURE__ */ jsx3(
          "img",
          {
            src: "https://images.unsplash.com/photo-1604259597308-5321e8e4789c?w=900&h=675&fit=crop&auto=format&q=85",
            alt: "A balanced Ready Series meal",
            className: "w-full aspect-[4/3] object-cover rounded-2xl"
          }
        ),
        /* @__PURE__ */ jsx3(
          "img",
          {
            src: "https://images.unsplash.com/photo-1609710219624-201223bd6b1e?w=900&h=675&fit=crop&auto=format&q=85",
            alt: "A prepared meal ready to store",
            className: "w-full aspect-[4/3] object-cover rounded-2xl"
          }
        )
      ] }),
      /* @__PURE__ */ jsx3("div", { className: "grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10", children: [
        [
          "01",
          "Cook with purpose",
          "Meals begin in the same trusted Performance Meals kitchen, with flavour and everyday usefulness considered together."
        ],
        [
          "02",
          "Portion with clarity",
          "Each option presents its protein, calories, and meal information clearly so customers can choose with confidence."
        ],
        [
          "03",
          "Freeze for the moment ahead",
          "Meals are frozen after preparation to help preserve quality until the day they are needed."
        ],
        [
          "04",
          "Ready when life changes",
          "Keep it in the freezer, heat it in minutes, and make a busy day feel more manageable."
        ]
      ].map(([number, title, copy]) => /* @__PURE__ */ jsxs3(
        "div",
        {
          className: "bg-[#1A1A1A] px-6 py-8 min-h-[260px] flex flex-col",
          children: [
            /* @__PURE__ */ jsx3("span", { className: "font-mono text-[10px] text-[#F5B300]", children: number }),
            /* @__PURE__ */ jsxs3("div", { className: "mt-auto pt-12", children: [
              /* @__PURE__ */ jsx3("h3", { className: "font-display text-[20px] font-extrabold", children: title }),
              /* @__PURE__ */ jsx3("p", { className: "text-white/45 text-[13px] leading-relaxed mt-3", children: copy })
            ] })
          ]
        },
        number
      )) })
    ] }) }),
    /* @__PURE__ */ jsx3("section", { className: "px-6 sm:px-10 py-20 sm:py-28 bg-[#FFFDF8]", children: /* @__PURE__ */ jsxs3("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs3("div", { className: "text-center max-w-[760px] mx-auto mb-14", children: [
        /* @__PURE__ */ jsx3("p", { className: "text-[#806A2A] text-[10px] font-bold tracking-[0.24em] uppercase mb-5", children: "Why it matters" }),
        /* @__PURE__ */ jsx3("h2", { className: "font-display text-[42px] sm:text-[58px] font-black leading-[0.94] tracking-[-0.035em]", children: "Not every important meal happens on schedule." }),
        /* @__PURE__ */ jsx3("p", { className: "text-[#71685F] text-[15px] leading-relaxed mt-6", children: "Ready Series is not about replacing the meals you love. It is about protecting the moments when time, energy, or plans would otherwise push a proper meal aside." })
      ] }),
      /* @__PURE__ */ jsx3("div", { className: "grid md:grid-cols-3 gap-5", children: [
        [
          "After the late meeting",
          "Dinner is already handled, so a long workday does not have to end with another decision."
        ],
        [
          "Between training and home",
          "A clear, high-protein option is ready when recovery matters and time is short."
        ],
        [
          "When the family day changes",
          "A useful backup in the freezer creates room for the people and plans that need attention first."
        ]
      ].map(([title, copy], index) => /* @__PURE__ */ jsxs3(
        "article",
        {
          className: "bg-[#F7F2E8] border border-[#DED7CD] rounded-2xl p-7 min-h-[290px] flex flex-col hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(52,42,30,0.10)] transition-all duration-300",
          children: [
            /* @__PURE__ */ jsxs3("span", { className: "font-mono text-[10px] text-[#A67A16]", children: [
              "0",
              index + 1
            ] }),
            /* @__PURE__ */ jsxs3("div", { className: "mt-auto", children: [
              /* @__PURE__ */ jsx3("h3", { className: "font-display text-[24px] font-extrabold leading-tight", children: title }),
              /* @__PURE__ */ jsx3("p", { className: "text-[#71685F] text-[13px] leading-relaxed mt-4", children: copy })
            ] })
          ]
        },
        title
      )) })
    ] }) }),
    /* @__PURE__ */ jsx3("section", { className: "bg-[#F5B300] px-6 sm:px-10 py-16 sm:py-20", children: /* @__PURE__ */ jsxs3("div", { className: "max-w-[1280px] mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center", children: [
      /* @__PURE__ */ jsxs3("div", { children: [
        /* @__PURE__ */ jsx3("p", { className: "text-[10px] font-bold tracking-[0.22em] uppercase mb-4", children: "One range, three ways to buy" }),
        /* @__PURE__ */ jsx3("h2", { className: "font-display text-[38px] sm:text-[48px] font-black leading-[0.95]", children: "Choose what fits this season of life." })
      ] }),
      /* @__PURE__ */ jsx3("div", { className: "grid sm:grid-cols-3 gap-px bg-black/15", children: [
        ["Individual", "Choose exactly what you want, once."],
        ["Bundles", "Stock up with a predefined selection."],
        ["Subscription", "Keep your freezer ready on a recurring plan."]
      ].map(([title, copy]) => /* @__PURE__ */ jsxs3("div", { className: "bg-[#F5B300] px-5 py-6", children: [
        /* @__PURE__ */ jsx3("h3", { className: "font-display text-[18px] font-extrabold", children: title }),
        /* @__PURE__ */ jsx3("p", { className: "text-black/60 text-[12px] leading-relaxed mt-2", children: copy })
      ] }, title)) })
    ] }) }),
    /* @__PURE__ */ jsxs3("section", { className: "relative min-h-[560px] flex items-center overflow-hidden", children: [
      /* @__PURE__ */ jsx3(
        "img",
        {
          src: closingFamilyImage,
          alt: "Family enjoying time together around a shared meal",
          className: "absolute inset-0 w-full h-full object-cover object-center"
        }
      ),
      /* @__PURE__ */ jsx3("div", { className: "absolute inset-0 bg-black/65" }),
      /* @__PURE__ */ jsxs3("div", { className: "relative z-10 max-w-[900px] mx-auto px-6 py-20 text-center text-white", children: [
        /* @__PURE__ */ jsx3("p", { className: "text-[#F5B300] text-[10px] font-bold uppercase tracking-[0.25em] mb-6", children: "Ready for the life around the meal" }),
        /* @__PURE__ */ jsxs3("h2", { className: "font-display text-[42px] sm:text-[64px] font-black leading-[0.92] tracking-[-0.04em]", children: [
          "Less time solving dinner.",
          /* @__PURE__ */ jsx3("br", {}),
          "More time living it."
        ] }),
        /* @__PURE__ */ jsx3("p", { className: "text-white/65 text-[16px] leading-relaxed max-w-[600px] mx-auto mt-6", children: "Put a better fallback in the freezer and give tomorrow\u2019s busy version of you one less thing to carry." }),
        /* @__PURE__ */ jsx3(
          "button",
          {
            "data-native-href": navigate2("ready-series-order"),
            className: "mt-9 rounded-full bg-[#F5B300] text-[#1A1A1A] px-8 py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] hover:bg-white transition-colors",
            children: "Find your Ready Series"
          }
        )
      ] })
    ] })
  ] });
}

// ../../../../2026-10-08/referenced-chatgpt-conversation-this-is-an/work/approved-source/src/pages/MealPlanAboutPage.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var heroImage = "https://images.unsplash.com/photo-1644704170910-a0cdf183649b?w=1000&h=1200&fit=crop&auto=format&q=85";
var routineImage = "https://images.unsplash.com/photo-1695654689751-a6e9086c13e2?w=1200&h=900&fit=crop&auto=format&q=85";
var kitchenImage2 = "https://images.unsplash.com/photo-1574966740793-953ad374e8fe?w=900&h=1100&fit=crop&auto=format&q=85";
var platingImage = "https://images.unsplash.com/photo-1761095596765-c8abe01d3aea?w=900&h=1100&fit=crop&auto=format&q=85";
var mealImage = "https://images.unsplash.com/photo-1591931026145-a66b07efda27?w=1200&h=900&fit=crop&auto=format&q=85";
function MealPlanAboutPage({
  navigate: navigate2,
  navigateToWizard: navigateToWizard2
}) {
  return /* @__PURE__ */ jsxs4("div", { className: "min-h-screen bg-[#FAF7F2] text-[#1A1A1A]", children: [
    /* @__PURE__ */ jsxs4("section", { className: "max-w-[1280px] mx-auto px-6 sm:px-10 py-20 sm:py-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center", children: [
      /* @__PURE__ */ jsxs4("div", { children: [
        /* @__PURE__ */ jsx4(MealPlanLogo, { size: "md", variant: "light" }),
        /* @__PURE__ */ jsx4("p", { className: "text-[#E85D04] text-[11px] font-semibold tracking-[0.3em] uppercase mt-16 mb-5", children: "Boutique progress \xB7 built around your goal" }),
        /* @__PURE__ */ jsxs4("h1", { className: "font-display text-[48px] sm:text-[70px] font-semibold leading-[0.9] tracking-[-0.035em]", children: [
          "Structure that",
          /* @__PURE__ */ jsx4("br", {}),
          /* @__PURE__ */ jsx4("span", { className: "italic font-light text-[#E85D04]", children: "moves with you." })
        ] }),
        /* @__PURE__ */ jsx4("p", { className: "text-[#675F58] text-[17px] leading-relaxed max-w-[580px] mt-7", children: "Meal Plan is the guided side of Performance Meals: fresh, structured meals and a clear recurring rhythm that take nutrition planning off your plate." }),
        /* @__PURE__ */ jsxs4("div", { className: "flex flex-col sm:flex-row gap-3 mt-9", children: [
          /* @__PURE__ */ jsx4(
            "button",
            {
              "data-native-href": navigateToWizard2(),
              className: "rounded-full bg-[#E85D04] text-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-[#1A1A1A] transition-colors",
              children: "Start your plan"
            }
          ),
          /* @__PURE__ */ jsx4(
            "button",
            {
              "data-native-href": navigate2("meal-plan-stories"),
              className: "rounded-full border border-[#1A1A1A]/20 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.16em] hover:border-[#1A1A1A] transition-colors",
              children: "Read customer journeys"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "relative", children: [
        /* @__PURE__ */ jsx4(
          "img",
          {
            src: heroImage,
            alt: "A balanced meal as part of an active routine",
            className: "w-full h-[580px] object-cover rounded-t-full"
          }
        ),
        /* @__PURE__ */ jsx4("div", { className: "absolute -bottom-5 -left-3 sm:-left-5 bg-[#E85D04] text-white px-6 py-5 text-[10px] font-semibold uppercase tracking-[0.18em]", children: "Fresh meals \xB7 guided rhythm" })
      ] })
    ] }),
    /* @__PURE__ */ jsx4("section", { className: "bg-[#1A1A1A] text-white px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs4("div", { className: "max-w-[1280px] mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-24 items-center", children: [
      /* @__PURE__ */ jsxs4("div", { children: [
        /* @__PURE__ */ jsx4("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.25em] uppercase mb-5", children: "Why Meal Plan exists" }),
        /* @__PURE__ */ jsx4("h2", { className: "font-display text-[42px] sm:text-[60px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "Your goal needs a routine, not more guesswork." }),
        /* @__PURE__ */ jsx4("p", { className: "text-white/55 text-[16px] leading-relaxed mt-7 max-w-[560px]", children: "Planning meals, shopping, preparing food, calculating portions, and repeating it every week creates friction. Meal Plan turns those repeated decisions into one considered programme." })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "relative overflow-hidden rounded-2xl min-h-[500px]", children: [
        /* @__PURE__ */ jsx4(
          "img",
          {
            src: routineImage,
            alt: "Busy professionals planning their routine together",
            className: "absolute inset-0 w-full h-full object-cover"
          }
        ),
        /* @__PURE__ */ jsxs4("div", { className: "absolute inset-x-5 bottom-5 bg-white text-[#1A1A1A] rounded-2xl p-6 shadow-2xl", children: [
          /* @__PURE__ */ jsx4("p", { className: "text-[10px] font-bold tracking-[0.18em] uppercase text-[#E85D04]", children: "The customer job" }),
          /* @__PURE__ */ jsx4("p", { className: "font-display text-[22px] font-semibold leading-tight mt-2", children: "Make better nutrition easier to sustain inside a full life." })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx4("section", { className: "px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs4("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs4("div", { className: "grid lg:grid-cols-2 gap-10 items-end mb-12", children: [
        /* @__PURE__ */ jsxs4("div", { children: [
          /* @__PURE__ */ jsx4("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.25em] uppercase mb-5", children: "What Meal Plan is" }),
          /* @__PURE__ */ jsx4("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "A programme with clear guardrails." })
        ] }),
        /* @__PURE__ */ jsx4("p", { className: "text-[#6D655E] text-[15px] leading-relaxed max-w-[520px] lg:justify-self-end", children: "It is not an unrestricted meal selection. Your goal establishes the programme, the plan defines what is included, and meal selection happens inside the approved structure." })
      ] }),
      /* @__PURE__ */ jsx4("div", { className: "grid sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
        [
          "01",
          "Goal-first start",
          "Begin with Biweekly, Monthly, 2 Months, 6 by 60, or 6 by 60 Plus so the plan has a clear operating rhythm."
        ],
        [
          "02",
          "Fresh structured meals",
          "Predefined plan information sets the meal framework before menu choices are made."
        ],
        [
          "03",
          "A visible menu rhythm",
          "Biweekly shows 2 weeks; Monthly shows 4. The preview follows the selected recurring period."
        ],
        [
          "04",
          "Account-managed continuity",
          "Sign-in is required so delivery, plan status, pauses, and permitted changes stay connected."
        ]
      ].map(([number, title, copy]) => /* @__PURE__ */ jsxs4(
        "article",
        {
          className: "bg-white border border-[#E3DDD5] rounded-2xl p-7 min-h-[310px] flex flex-col hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(42,35,29,0.08)] transition-all duration-300",
          children: [
            /* @__PURE__ */ jsx4("span", { className: "font-mono text-[10px] text-[#E85D04]", children: number }),
            /* @__PURE__ */ jsxs4("div", { className: "mt-auto", children: [
              /* @__PURE__ */ jsx4("h3", { className: "font-display text-[21px] font-semibold", children: title }),
              /* @__PURE__ */ jsx4("p", { className: "text-[#736A62] text-[13px] leading-relaxed mt-3", children: copy })
            ] })
          ]
        },
        number
      )) })
    ] }) }),
    /* @__PURE__ */ jsx4("section", { className: "bg-white border-y border-[#E3DDD5] px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs4("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs4("div", { className: "max-w-[760px] mb-14", children: [
        /* @__PURE__ */ jsx4("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.25em] uppercase mb-5", children: "How the meals are prepared" }),
        /* @__PURE__ */ jsx4("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "The structure is planned. The food is still the point." }),
        /* @__PURE__ */ jsx4("p", { className: "text-[#6D655E] text-[15px] leading-relaxed mt-6", children: "Meal Plan pairs programme logic with fresh meal preparation, clear food information, and a menu experience designed to feel considered rather than clinical." })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "grid lg:grid-cols-[0.8fr_1.2fr] gap-5 mb-12", children: [
        /* @__PURE__ */ jsx4(
          "img",
          {
            src: kitchenImage2,
            alt: "Chef preparing fresh ingredients in a professional kitchen",
            className: "w-full h-[560px] object-cover rounded-2xl"
          }
        ),
        /* @__PURE__ */ jsxs4("div", { className: "grid sm:grid-cols-2 gap-5", children: [
          /* @__PURE__ */ jsx4(
            "img",
            {
              src: platingImage,
              alt: "Chef carefully plating a prepared meal",
              className: "w-full h-[270px] object-cover rounded-2xl"
            }
          ),
          /* @__PURE__ */ jsx4(
            "img",
            {
              src: mealImage,
              alt: "Finished fresh meal ready for the customer",
              className: "w-full h-[270px] object-cover rounded-2xl"
            }
          ),
          /* @__PURE__ */ jsx4("div", { className: "sm:col-span-2 bg-[#F3EEE7] rounded-2xl p-7 min-h-[270px] grid sm:grid-cols-2 gap-7", children: [
            [
              "Plan the menu",
              "Programme and recurring period establish the structured menu view."
            ],
            [
              "Prepare with care",
              "Meals are prepared through the shared Performance Meals kitchen standard."
            ],
            [
              "Portion with clarity",
              "Meal and programme information helps customers understand what is included."
            ],
            [
              "Deliver the routine",
              "Fresh meals arrive as part of the selected programme and delivery structure."
            ]
          ].map(([title, copy]) => /* @__PURE__ */ jsxs4("div", { className: "border-t border-[#D8CEC3] pt-4", children: [
            /* @__PURE__ */ jsx4("h3", { className: "font-display text-[17px] font-semibold", children: title }),
            /* @__PURE__ */ jsx4("p", { className: "text-[#756C64] text-[12px] leading-relaxed mt-2", children: copy })
          ] }, title)) })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx4("section", { className: "bg-[#2B241F] text-white px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs4("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs4("div", { className: "grid lg:grid-cols-2 gap-10 items-end mb-12", children: [
        /* @__PURE__ */ jsxs4("div", { children: [
          /* @__PURE__ */ jsx4("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.25em] uppercase mb-5", children: "The programme logic" }),
          /* @__PURE__ */ jsx4("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "Choose the rhythm that matches your life." })
        ] }),
        /* @__PURE__ */ jsx4("p", { className: "text-white/50 text-[15px] leading-relaxed max-w-[520px] lg:justify-self-end", children: "Recurring subscriptions cover Monday to Friday. Fixed 6 by 60 programmes remain a separate path with all-week coverage." })
      ] }),
      /* @__PURE__ */ jsx4("div", { className: "grid md:grid-cols-3 gap-4 mb-6", children: [
        [
          "Biweekly",
          "2-week menu view",
          "Mon\u2013Fri coverage \xB7 renews every 2 weeks"
        ],
        [
          "Monthly",
          "4-week menu view",
          "Mon\u2013Fri coverage \xB7 renews every month"
        ],
        [
          "2 Months",
          "Structured menu view",
          "Mon\u2013Fri coverage \xB7 renews every 2 months"
        ]
      ].map(([title, view, copy]) => /* @__PURE__ */ jsxs4(
        "div",
        {
          className: "rounded-2xl border border-white/10 bg-white/[0.04] p-7 min-h-[230px]",
          children: [
            /* @__PURE__ */ jsx4("h3", { className: "font-display text-[26px] font-semibold", children: title }),
            /* @__PURE__ */ jsx4("div", { className: "text-[#E85D04] text-[11px] font-bold uppercase tracking-[0.14em] mt-6", children: view }),
            /* @__PURE__ */ jsx4("p", { className: "text-white/45 text-[13px] leading-relaxed mt-3", children: copy })
          ]
        },
        title
      )) }),
      /* @__PURE__ */ jsxs4("div", { className: "rounded-2xl bg-[#E85D04] text-white p-7 sm:p-9 flex flex-col lg:flex-row lg:items-center justify-between gap-6", children: [
        /* @__PURE__ */ jsxs4("div", { children: [
          /* @__PURE__ */ jsx4("p", { className: "text-[10px] font-bold uppercase tracking-[0.2em] text-white/65", children: "Separate fixed programmes" }),
          /* @__PURE__ */ jsx4("h3", { className: "font-display text-[30px] font-semibold mt-2", children: "6 by 60 and 6 by 60 Plus" }),
          /* @__PURE__ */ jsx4("p", { className: "text-white/70 text-[13px] leading-relaxed max-w-[700px] mt-2", children: "60-day, all-week programmes for the approved 6kg+ goal pathway. Plus adds the approved muscle-support direction." })
        ] }),
        /* @__PURE__ */ jsx4(
          "button",
          {
            "data-native-href": navigateToWizard2("6by60"),
            className: "shrink-0 rounded-full bg-white text-[#1A1A1A] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.16em] hover:bg-[#1A1A1A] hover:text-white transition-colors",
            children: "Explore programmes"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx4("section", { className: "px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs4("div", { className: "max-w-[1100px] mx-auto text-center", children: [
      /* @__PURE__ */ jsx4("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.25em] uppercase mb-5", children: "What Meal Plan gives back" }),
      /* @__PURE__ */ jsx4("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "Less planning around food. More attention for everything else." }),
      /* @__PURE__ */ jsx4("div", { className: "grid sm:grid-cols-3 gap-4 text-left mt-12", children: [
        [
          "Planning",
          "A programme framework replaces the repeated question of what to organise next."
        ],
        [
          "Preparation",
          "Fresh prepared meals reduce the cooking and cleanup load across the working week."
        ],
        [
          "Decision-making",
          "Clear plan information and structured menus narrow the choices that matter."
        ]
      ].map(([title, copy]) => /* @__PURE__ */ jsxs4("div", { className: "border-t-2 border-[#E85D04] pt-6", children: [
        /* @__PURE__ */ jsx4("h3", { className: "font-display text-[22px] font-semibold", children: title }),
        /* @__PURE__ */ jsx4("p", { className: "text-[#70675F] text-[13px] leading-relaxed mt-3", children: copy })
      ] }, title)) })
    ] }) }),
    /* @__PURE__ */ jsxs4("section", { className: "bg-[#E85D04] text-white px-6 py-20 text-center", children: [
      /* @__PURE__ */ jsx4("p", { className: "text-[10px] font-bold uppercase tracking-[0.24em] text-white/70 mb-5", children: "Exceptional meals \xB7 practical guidance \xB7 meaningful progress" }),
      /* @__PURE__ */ jsx4("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold", children: "Build a routine around your goal." }),
      /* @__PURE__ */ jsxs4("div", { className: "flex flex-col sm:flex-row justify-center gap-3 mt-8", children: [
        /* @__PURE__ */ jsx4(
          "button",
          {
            "data-native-href": navigateToWizard2(),
            className: "rounded-full bg-white text-[#1A1A1A] px-8 py-4 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-[#1A1A1A] hover:text-white transition-colors",
            children: "Start Meal Plan"
          }
        ),
        /* @__PURE__ */ jsx4(
          "button",
          {
            "data-native-href": navigate2("meal-plan-stories"),
            className: "rounded-full border border-white/35 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.16em] hover:border-white transition-colors",
            children: "Read customer journeys"
          }
        )
      ] })
    ] })
  ] });
}

// ../../../../2026-10-08/referenced-chatgpt-conversation-this-is-an/work/approved-source/src/pages/MealPlanStoriesPage.tsx
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var heroImage2 = "https://images.unsplash.com/photo-1695653422557-3b85c1d6d061?w=1500&h=1000&fit=crop&auto=format&q=85";
var professionalImage = "https://images.unsplash.com/photo-1695654400381-3f1db5e8d656?w=1000&h=1200&fit=crop&auto=format&q=85";
var routineImage2 = "https://images.unsplash.com/photo-1585838518259-0ceb89d92cd2?w=1000&h=1200&fit=crop&auto=format&q=85";
var familyImage2 = "https://images.unsplash.com/photo-1695654687832-7ee8241cb346?w=1000&h=1200&fit=crop&auto=format&q=85";
var trainingImage = "https://images.unsplash.com/photo-1751456357820-c2030c293c71?w=1200&h=900&fit=crop&auto=format&q=85";
var journeys = [
  {
    number: "02",
    image: routineImage2,
    title: "Returning to a routine after a demanding season",
    context: "When work, travel, or family needs disrupt familiar habits, restarting can feel harder than beginning.",
    role: "A goal-first programme creates a defined next step, while fresh weekday meals reduce the preparation burden during the return.",
    rhythm: "Monthly programme \xB7 Recurring rhythm"
  },
  {
    number: "03",
    image: familyImage2,
    title: "Making weekday food simpler for a full household",
    context: "The person organising meals often carries the planning, shopping, cooking, and cleanup decisions for everyone.",
    role: "A structured Monday\u2013Friday plan can protect time and attention without turning the week into another optimisation project.",
    rhythm: "Balanced routine \xB7 Biweekly rhythm"
  },
  {
    number: "04",
    image: trainingImage,
    title: "Supporting training without living around meal prep",
    context: "Consistent training asks for consistent food, but the work around that food can compete with recovery and the rest of life.",
    role: "A predefined programme and clear meal information make the routine easier to repeat while keeping the customer\u2019s goal visible.",
    rhythm: "Performance direction \xB7 Structured programme"
  }
];
function MealPlanStoriesPage({
  navigate: navigate2,
  navigateToWizard: navigateToWizard2
}) {
  return /* @__PURE__ */ jsxs5("div", { className: "min-h-screen bg-[#FAF7F2] text-[#1A1A1A]", children: [
    /* @__PURE__ */ jsxs5("section", { className: "relative min-h-[720px] overflow-hidden flex items-end", children: [
      /* @__PURE__ */ jsx5(
        "img",
        {
          src: heroImage2,
          alt: "Professionals discussing their routine together",
          className: "absolute inset-0 w-full h-full object-cover"
        }
      ),
      /* @__PURE__ */ jsx5("div", { className: "absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" }),
      /* @__PURE__ */ jsx5("div", { className: "absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" }),
      /* @__PURE__ */ jsxs5("div", { className: "relative z-10 max-w-[1280px] w-full mx-auto px-6 sm:px-10 py-16 sm:py-24 text-white", children: [
        /* @__PURE__ */ jsx5(MealPlanLogo, { size: "sm", variant: "dark" }),
        /* @__PURE__ */ jsx5("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.25em] uppercase mt-14 mb-6", children: "Customer journeys" }),
        /* @__PURE__ */ jsx5("h1", { className: "font-display text-[50px] sm:text-[72px] lg:text-[82px] font-semibold leading-[0.9] tracking-[-0.04em] max-w-[850px]", children: "Real life is the reason the plan exists." }),
        /* @__PURE__ */ jsx5("p", { className: "text-white/70 text-[17px] leading-relaxed max-w-[620px] mt-7", children: "Meal Plan is not only about what arrives. It is about the planning, decisions, and weekday pressure that no longer have to be carried alone." })
      ] })
    ] }),
    /* @__PURE__ */ jsx5("section", { className: "bg-[#E85D04] text-white px-6 py-5", children: /* @__PURE__ */ jsxs5("div", { className: "max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx5("p", { className: "font-display text-[18px] font-semibold", children: "Story content awaiting verified customer approvals." }),
      /* @__PURE__ */ jsx5("p", { className: "text-white/75 text-[12px] leading-relaxed max-w-[680px]", children: "The journeys below are clearly identified illustrative scenarios. Final publication requires approved customer interviews, quotations, outcome claims, and image consent." })
    ] }) }),
    /* @__PURE__ */ jsx5("section", { className: "px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs5("div", { className: "max-w-[1280px] mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-center", children: [
      /* @__PURE__ */ jsxs5("div", { className: "relative", children: [
        /* @__PURE__ */ jsx5(
          "img",
          {
            src: professionalImage,
            alt: "Representative image of a professional managing a busy day",
            className: "w-full h-[620px] object-cover rounded-2xl"
          }
        ),
        /* @__PURE__ */ jsx5("div", { className: "absolute top-5 left-5 bg-[#1A1A1A] text-white rounded-full px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em]", children: "Illustrative journey 01" })
      ] }),
      /* @__PURE__ */ jsxs5("article", { children: [
        /* @__PURE__ */ jsx5("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.24em] uppercase mb-5", children: "The late-meeting week" }),
        /* @__PURE__ */ jsx5("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "When the workday keeps taking dinner with it." }),
        /* @__PURE__ */ jsx5("p", { className: "text-[#625A53] text-[16px] leading-relaxed mt-7", children: "A busy professional can know exactly how they want to eat and still lose the routine to back-to-back meetings, commuting, and the decisions waiting at the end of the day." }),
        /* @__PURE__ */ jsx5("div", { className: "mt-9 space-y-0 border-y border-[#DED6CD]", children: [
          [
            "The pressure",
            "Meal planning begins after the calendar is already full, making convenience the default rather than a deliberate choice."
          ],
          [
            "The Meal Plan role",
            "Fresh weekday meals and a recurring structure move preparation earlier, so dinner no longer starts with another decision."
          ],
          [
            "The experience",
            "The customer still chooses within the approved menu structure, but the programme carries the recurring organisation."
          ]
        ].map(([label, copy]) => /* @__PURE__ */ jsxs5(
          "div",
          {
            className: "grid sm:grid-cols-[150px_1fr] gap-3 py-5 border-b border-[#DED6CD] last:border-0",
            children: [
              /* @__PURE__ */ jsx5("h3", { className: "text-[#E85D04] text-[10px] font-bold uppercase tracking-[0.16em] pt-1", children: label }),
              /* @__PURE__ */ jsx5("p", { className: "text-[#6D655E] text-[13px] leading-relaxed", children: copy })
            ]
          },
          label
        )) }),
        /* @__PURE__ */ jsx5("p", { className: "text-[10px] font-mono uppercase tracking-[0.14em] text-[#988E84] mt-6", children: "Representative imagery \xB7 not a customer testimonial" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx5("section", { className: "bg-[#1A1A1A] text-white px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs5("div", { className: "max-w-[1280px] mx-auto", children: [
      /* @__PURE__ */ jsxs5("div", { className: "max-w-[760px] mb-14", children: [
        /* @__PURE__ */ jsx5("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.24em] uppercase mb-5", children: "Different lives \xB7 one need for structure" }),
        /* @__PURE__ */ jsx5("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "Progress looks different inside every routine." })
      ] }),
      /* @__PURE__ */ jsx5("div", { className: "grid lg:grid-cols-3 gap-5", children: journeys.map((story) => /* @__PURE__ */ jsxs5(
        "article",
        {
          className: "bg-[#25201C] border border-white/10 rounded-2xl overflow-hidden flex flex-col",
          children: [
            /* @__PURE__ */ jsxs5("div", { className: "relative h-[330px] overflow-hidden", children: [
              /* @__PURE__ */ jsx5(
                "img",
                {
                  src: story.image,
                  alt: "Representative lifestyle image for an illustrative customer journey",
                  className: "w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                }
              ),
              /* @__PURE__ */ jsxs5("span", { className: "absolute top-4 left-4 bg-[#E85D04] text-white rounded-full px-3 py-1.5 text-[9px] font-bold tracking-[0.14em]", children: [
                "Illustrative ",
                story.number
              ] })
            ] }),
            /* @__PURE__ */ jsxs5("div", { className: "p-7 flex flex-col flex-1", children: [
              /* @__PURE__ */ jsx5("p", { className: "text-[#E85D04] text-[9px] font-bold uppercase tracking-[0.14em]", children: story.rhythm }),
              /* @__PURE__ */ jsx5("h3", { className: "font-display text-[25px] font-semibold leading-tight mt-4", children: story.title }),
              /* @__PURE__ */ jsxs5("div", { className: "mt-7 space-y-5", children: [
                /* @__PURE__ */ jsxs5("div", { children: [
                  /* @__PURE__ */ jsx5("p", { className: "text-white/35 text-[9px] font-bold uppercase tracking-[0.15em]", children: "Life context" }),
                  /* @__PURE__ */ jsx5("p", { className: "text-white/55 text-[13px] leading-relaxed mt-2", children: story.context })
                ] }),
                /* @__PURE__ */ jsxs5("div", { children: [
                  /* @__PURE__ */ jsx5("p", { className: "text-white/35 text-[9px] font-bold uppercase tracking-[0.15em]", children: "Where Meal Plan helps" }),
                  /* @__PURE__ */ jsx5("p", { className: "text-white/55 text-[13px] leading-relaxed mt-2", children: story.role })
                ] })
              ] }),
              /* @__PURE__ */ jsx5("p", { className: "mt-auto pt-8 text-[9px] font-mono uppercase tracking-[0.12em] text-white/25", children: "Representative imagery \xB7 no outcome claim" })
            ] })
          ]
        },
        story.number
      )) })
    ] }) }),
    /* @__PURE__ */ jsx5("section", { className: "px-6 sm:px-10 py-20 sm:py-28", children: /* @__PURE__ */ jsxs5("div", { className: "max-w-[1100px] mx-auto", children: [
      /* @__PURE__ */ jsxs5("div", { className: "text-center max-w-[760px] mx-auto mb-12", children: [
        /* @__PURE__ */ jsx5("p", { className: "text-[#E85D04] text-[10px] font-bold tracking-[0.24em] uppercase mb-5", children: "The stories we want to tell responsibly" }),
        /* @__PURE__ */ jsx5("h2", { className: "font-display text-[42px] sm:text-[56px] font-semibold leading-[0.94] tracking-[-0.035em]", children: "Experience before exaggeration." }),
        /* @__PURE__ */ jsx5("p", { className: "text-[#6D655E] text-[15px] leading-relaxed mt-6", children: "Verified customer interviews should focus on what the programme actually felt like\u2014not unsupported transformation promises." })
      ] }),
      /* @__PURE__ */ jsx5("div", { className: "grid sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
        [
          "Routine",
          "How Meal Plan fitted into work, family, training, and changing weeks."
        ],
        [
          "Food",
          "Which meals felt enjoyable, practical, and easy to repeat."
        ],
        [
          "Support",
          "How programme structure and approved support shaped the experience."
        ],
        [
          "Progress",
          "What changed, using only consented and properly supported customer outcomes."
        ]
      ].map(([title, copy]) => /* @__PURE__ */ jsxs5(
        "div",
        {
          className: "bg-white border border-[#E2DBD3] rounded-2xl p-6 min-h-[220px]",
          children: [
            /* @__PURE__ */ jsx5("h3", { className: "font-display text-[21px] font-semibold", children: title }),
            /* @__PURE__ */ jsx5("p", { className: "text-[#70675F] text-[13px] leading-relaxed mt-4", children: copy })
          ]
        },
        title
      )) })
    ] }) }),
    /* @__PURE__ */ jsxs5("section", { className: "bg-[#E85D04] text-white px-6 py-20 text-center", children: [
      /* @__PURE__ */ jsx5("p", { className: "text-white/65 text-[10px] font-bold uppercase tracking-[0.24em] mb-5", children: "Your routine can begin before the testimonial does" }),
      /* @__PURE__ */ jsx5("h2", { className: "font-display text-[42px] sm:text-[58px] font-semibold", children: "Explore the Meal Plan structure." }),
      /* @__PURE__ */ jsx5("p", { className: "text-white/70 text-[14px] leading-relaxed max-w-[580px] mx-auto mt-5", children: "Choose a programme, understand what is included, and see the menu rhythm before continuing." }),
      /* @__PURE__ */ jsxs5("div", { className: "flex flex-col sm:flex-row justify-center gap-3 mt-8", children: [
        /* @__PURE__ */ jsx5(
          "button",
          {
            "data-native-href": navigateToWizard2(),
            className: "rounded-full bg-white text-[#1A1A1A] px-8 py-4 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-[#1A1A1A] hover:text-white transition-colors",
            children: "Start Meal Plan"
          }
        ),
        /* @__PURE__ */ jsx5(
          "button",
          {
            "data-native-href": navigate2("meal-plan-about"),
            className: "rounded-full border border-white/35 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.16em] hover:border-white transition-colors",
            children: "How Meal Plan works"
          }
        )
      ] })
    ] })
  ] });
}

// <stdin>
var navigate = (p) => p === "ready-series-order" ? "/collections/ready-series" : "/pages/" + p;
var navigateToWizard = (p) => "/pages/meal-plan-builder" + (p ? "?programme=" + p : "");
var navigateToReadyOrder = (m) => "/collections/ready-series" + { single: "", bundles: "-bundles", subscription: "-subscriptions" }[m];
var stdin_default = [renderToStaticMarkup(React.createElement(ReadySeriesLandingPage, { navigate, navigateToWizard, navigateToReadyOrder })), renderToStaticMarkup(React.createElement(ReadySeriesAboutPage, { navigate, navigateToWizard, navigateToReadyOrder })), renderToStaticMarkup(React.createElement(MealPlanAboutPage, { navigate, navigateToWizard, navigateToReadyOrder })), renderToStaticMarkup(React.createElement(MealPlanStoriesPage, { navigate, navigateToWizard, navigateToReadyOrder }))];
export {
  stdin_default as default
};
