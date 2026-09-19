import Link from "next/link";

/**
 * Shared shell for simple text pages (terms, privacy, …).
 * Entity details come from env so they can be filled in without a code change.
 */
export const LEGAL = {
  brand: "TradeKwik",
  entity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "TradeKwik (a business under registration)",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "India",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "tradekwik.team@gmail.com",
  updated: "20 September 2026",
};

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:text-blue-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-700">{title}</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
      {intro && <p className="mt-3 text-stone-600">{intro}</p>}
      <p className="mt-2 text-xs text-stone-500">Last updated {LEGAL.updated} · Beta version, may change.</p>
      <article className="mt-8 grid gap-6 text-sm leading-relaxed text-stone-700">{children}</article>
      <p className="mt-10 border-t border-stone-200 pt-4 text-xs text-stone-500">
        Questions about this page? Email{" "}
        <a href={`mailto:${LEGAL.email}`} className="text-blue-700 underline">{LEGAL.email}</a>.
      </p>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <div className="mt-2 grid gap-2">{children}</div>
    </section>
  );
}

export function Mail({ subject }: { subject?: string }) {
  const href = subject ? `mailto:${LEGAL.email}?subject=${encodeURIComponent(subject)}` : `mailto:${LEGAL.email}`;
  return (
    <a href={href} className="text-blue-700 underline">
      {LEGAL.email}
    </a>
  );
}
