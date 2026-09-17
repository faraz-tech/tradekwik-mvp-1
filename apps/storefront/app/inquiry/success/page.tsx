import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Request sent",
  robots: { index: false },
};

interface SuccessPageProps {
  searchParams: Promise<{ type?: string; wa?: string }>;
}

export default async function InquirySuccessPage({ searchParams }: SuccessPageProps) {
  const { type, wa } = await searchParams;
  const isOrder = type === "order";
  // only ever link out to WhatsApp
  const waHref = wa?.startsWith("https://wa.me/") ? wa : null;

  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold text-stone-900 sm:text-3xl">
        {isOrder ? "Order request sent!" : "Inquiry sent!"}
      </h1>
      <p className="mt-3 max-w-md text-stone-600">
        The seller has been notified and will contact you on your mobile number, usually
        within a few hours.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            Continue on WhatsApp
          </a>
        )}
        <Link
          href="/"
          className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50"
        >
          Browse more products
        </Link>
      </div>
    </main>
  );
}
