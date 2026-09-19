"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  tone: string;
}

/** What TradeKwik offers today — honest, current, and pointing at a real page. */
const SLIDES: Slide[] = [
  {
    eyebrow: "Deal direct",
    title: "Talk to the business, not a middleman",
    body: "Every listing shows the seller's WhatsApp and phone. Inquire, negotiate and agree the price directly with the business.",
    cta: { label: "Browse sellers", href: "/search" },
    tone: "from-blue-700 to-blue-900",
  },
  {
    eyebrow: "Verified sellers",
    title: "Documents checked before the badge is shown",
    body: "GST, PAN, licenses and certificates are reviewed by our verification desk. Open any store's About page to see the people, the process and the paperwork.",
    cta: { label: "See a verified store", href: "/store/shakti-embroidery-machines/about" },
    tone: "from-emerald-700 to-emerald-900",
  },
  {
    eyebrow: "Track your order",
    title: "From inquiry to delivery, in one place",
    body: "Create a free buyer account to follow every order: confirmation, quote, transport booking with the LR / bilty number, and a one-tap call to the transporter.",
    cta: { label: "Create buyer account", href: "/account/register" },
    tone: "from-indigo-700 to-indigo-900",
  },
  {
    eyebrow: "Wholesale & retail",
    title: "Manufacturers, wholesalers and retailers side by side",
    body: "Filter by seller type, see quantity price breaks, and order at trade prices when you buy in bulk.",
    cta: { label: "Find wholesalers", href: "/search?kind=wholesaler" },
    tone: "from-amber-600 to-amber-800",
  },
  {
    eyebrow: "For businesses",
    title: "Sell on TradeKwik",
    body: "Register your business now. We are onboarding the first sellers by hand and will notify you when your store goes live. Buyers deal with you directly.",
    cta: { label: "Register your business", href: `${process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"}/register` },
    tone: "from-stone-700 to-stone-900",
  },
];

const INTERVAL_MS = 6000;

export function HomeHighlights() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[index];
  const external = slide.cta.href.startsWith("http");

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What TradeKwik offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${slide.tone} p-6 text-white shadow-md transition-colors duration-500 sm:p-10`}
    >
      <div key={index} className="tk-fadein sm:max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{slide.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{slide.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">{slide.body}</p>
        {external ? (
          <a
            href={slide.cta.href}
            className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-900 hover:bg-stone-100"
          >
            {slide.cta.label} →
          </a>
        ) : (
          <Link
            href={slide.cta.href}
            className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-900 hover:bg-stone-100"
          >
            {slide.cta.label} →
          </Link>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
          className="rounded-full border border-white/40 px-2.5 py-1 text-sm hover:bg-white/10"
        >
          ‹
        </button>
        <div className="flex gap-1.5" role="tablist">
          {SLIDES.map((s, i) => (
            <button
              key={s.eyebrow}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.eyebrow}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next"
          onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
          className="rounded-full border border-white/40 px-2.5 py-1 text-sm hover:bg-white/10"
        >
          ›
        </button>
        <span className="ml-auto hidden text-xs text-white/60 sm:inline">
          {index + 1} / {SLIDES.length}
        </span>
      </div>

    </section>
  );
}
