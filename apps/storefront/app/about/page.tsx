import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "About TradeKwik", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <LegalPage
      title="About TradeKwik"
      intro="A place where Indian buyers deal directly with the manufacturers, wholesalers and retailers who make and sell the goods."
    >
      <Section title="What we are building">
        <p>
          Small businesses in India sell mostly through phone calls, WhatsApp and word of mouth. TradeKwik
          puts those businesses online in a way that matches how they already work: a buyer finds a seller,
          reads about the company and the people behind it, and talks to them directly.
        </p>
        <p>
          We do not sit between buyer and seller. Prices are agreed between the two of you. What we add is
          trust and traceability: verified business documents, clear company profiles, and order tracking
          from inquiry to delivery, including the transporter&apos;s bilty number.
        </p>
      </Section>
      <Section title="Who it is for">
        <p>
          <strong>Buyers</strong> — boutiques, job-workers, shops, event planners and individuals looking for
          machines, materials, food or garments from a genuine source.
        </p>
        <p>
          <strong>Sellers</strong> — manufacturers, wholesalers, retailers and service providers who want buyers
          to find them and deal directly.
        </p>
      </Section>
      <Section title="Where we are today">
        <p>
          TradeKwik is in beta. We are onboarding the first sellers personally and improving the platform
          every week. If something does not work or you have an idea, please{" "}
          <Link href="/contact" className="text-blue-700 underline">tell us</Link>.
        </p>
        <p>Currently serving buyers and sellers in India. International use will come later.</p>
      </Section>
      <Section title="Operated by">
        <p>{LEGAL.entity}, {LEGAL.address}.</p>
      </Section>
    </LegalPage>
  );
}
