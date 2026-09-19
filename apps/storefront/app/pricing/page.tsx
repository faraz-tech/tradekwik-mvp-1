import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLANS, PLAN_DEFINITIONS, TRIAL_DAYS } from "@tradekwik/shared";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pricing for sellers",
  description: `Sell on TradeKwik: ${TRIAL_DAYS}-day full-access trial, then Basic, Pro or Unlimited plans. No commission on your sales.`,
  alternates: { canonical: "/pricing" },
  robots: { index: false },
};

const SELLER_APP_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

/** Hidden until launch: flip PRICING_PUBLIC to true (or set NEXT_PUBLIC_SHOW_PRICING=1). */
const PRICING_PUBLIC = process.env.NEXT_PUBLIC_SHOW_PRICING === "1";

export default function PricingPage() {
  if (!PRICING_PUBLIC) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">For sellers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Simple plans. No commission.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-stone-600">
          Every approved seller starts with a <strong>{TRIAL_DAYS}-day full-access trial</strong>. After that,
          pick the plan that fits your catalogue. Buyers deal with you directly — TradeKwik never takes a cut of
          your sales.
        </p>
        <p className="mx-auto mt-3 inline-block rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs text-amber-900">
          Early access: payments are collected by UPI / bank transfer and activated by our team. Online payment is coming soon.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((id) => {
          const plan = PLAN_DEFINITIONS[id];
          const popular = id === "pro";
          return (
            <section
              key={id}
              className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${popular ? "border-blue-400 ring-2 ring-blue-100" : "border-stone-200"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-900">{plan.name}</h2>
                {popular && <span className="rounded-full bg-blue-700 px-2.5 py-0.5 text-xs font-semibold text-white">Most popular</span>}
              </div>
              <p className="mt-1 text-sm text-stone-500">{plan.tagline}</p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-stone-900">{formatINR(plan.priceMonthly)}</span>
                <span className="text-sm text-stone-500"> / month + GST</span>
              </p>
              <p className="text-xs text-stone-500">
                or {formatINR(plan.priceYearly)} / year (about 2 months free)
              </p>
              <ul className="mt-5 grid gap-2 text-sm text-stone-700">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2"><span className="text-green-700">✓</span>{h}</li>
                ))}
              </ul>
              <a
                href={`${SELLER_APP_URL}/register`}
                className={`mt-6 rounded-full px-5 py-2.5 text-center text-sm font-semibold ${popular ? "bg-blue-700 text-white hover:bg-blue-800" : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"}`}
              >
                Start {TRIAL_DAYS}-day trial
              </a>
            </section>
          );
        })}
      </div>

      <section className="mt-12 grid gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <h3 className="font-semibold text-stone-900">What happens after the trial?</h3>
          <p className="mt-1 text-sm text-stone-600">
            Your store stays visible to buyers and you can still log in and read everything. Adding or editing
            products, replying with quotes and updating orders resume as soon as a plan is active.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-900">How do I pay right now?</h3>
          <p className="mt-1 text-sm text-stone-600">
            Open <em>Billing &amp; plan</em> in your seller panel and tap the WhatsApp button. Pay by UPI or bank
            transfer and we activate your plan the same day. Online payment is being added.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-900">Is there any commission?</h3>
          <p className="mt-1 text-sm text-stone-600">No. Buyers contact you directly and you agree the price yourselves.</p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-900">Are buyers charged?</h3>
          <p className="mt-1 text-sm text-stone-600">
            Never. Buyer accounts, inquiries and order tracking are free.{" "}
            <Link href="/account/register" className="text-blue-700 hover:underline">Create a buyer account</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
