import type { Metadata } from "next";
import { LEGAL, LegalPage, Mail, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

const SELLER_APP_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact us"
      intro="We read every message. During the beta, replies come from the founder directly."
    >
      <Section title="Email">
        <p>
          <Mail subject="TradeKwik" /> — for feedback, bug reports, seller listing requests and general
          questions. We usually reply within one working day.
        </p>
      </Section>
      <Section title="Sellers">
        <p>
          Want your business on TradeKwik?{" "}
          <a href={`${SELLER_APP_URL}/register`} className="text-blue-700 underline">Register here</a>. We are
          onboarding sellers by hand during the beta and will contact you on your registered mobile number.
        </p>
      </Section>
      <Section title="Buyers">
        <p>
          For a question about a product or an order, contact the seller directly using the WhatsApp or call
          buttons on their store page — they know their goods best. Contact us if a seller does not respond
          or if you believe a listing is misleading.
        </p>
      </Section>
      <Section title="Grievance officer">
        <p>
          Under the Information Technology Rules, 2021, complaints about content on this platform can be sent
          to the grievance officer at <Mail subject="Grievance" /> with the subject &ldquo;Grievance&rdquo;. We
          acknowledge within 24 hours and aim to resolve within 15 days.
        </p>
      </Section>
      <Section title="Postal address">
        <p>{LEGAL.entity}, {LEGAL.address}.</p>
      </Section>
    </LegalPage>
  );
}
