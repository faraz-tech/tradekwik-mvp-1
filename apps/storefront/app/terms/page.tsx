import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="By using TradeKwik you agree to these terms. They are written in plain language; please read them."
    >
      <Section title="1. What TradeKwik is">
        <p>
          TradeKwik is an online directory and communication platform operated by {LEGAL.entity}. It lets
          buyers discover sellers and contact them directly, and lets sellers list their business and
          products. TradeKwik is <strong>not</strong> a party to any sale. Every deal, price, payment,
          delivery and warranty is agreed between the buyer and the seller.
        </p>
      </Section>
      <Section title="2. Accounts">
        <p>
          You must be at least 18 and provide accurate information, including a working Indian mobile number
          that you verify by OTP. Keep your password private; you are responsible for activity on your
          account.
        </p>
        <p>Seller accounts are approved by TradeKwik before going live and may be paused or removed if these terms are broken.</p>
      </Section>
      <Section title="3. Sellers’ responsibilities">
        <p>
          Sellers must list only goods and services they can genuinely supply, describe them truthfully, hold
          the licences the law requires, and upload only authentic documents for verification. Prices shown
          are indicative; the final price is agreed with the buyer.
        </p>
        <p>Sellers are solely responsible for fulfilment, quality, invoicing, taxes and after-sales service.</p>
      </Section>
      <Section title="4. Buyers’ responsibilities">
        <p>
          Do your own checks before paying an advance. Use the seller&apos;s verified documents, company profile
          and the order-tracking tools as aids, not guarantees. Do not send inquiries or orders you do not
          intend to follow through.
        </p>
      </Section>
      <Section title="5. Verification badges">
        <p>
          &ldquo;Verified seller&rdquo; means TradeKwik has reviewed documents the seller uploaded and found them
          consistent. It is not a guarantee of the seller&apos;s conduct, solvency or product quality. Badges can
          be withdrawn at any time.
        </p>
      </Section>
      <Section title="6. Acceptable use">
        <p>
          No fake listings, counterfeit goods, prohibited items, spam, scraping, attempts to bypass OTP or rate
          limits, or content that is unlawful under Indian law. We may remove content and suspend accounts
          that break this.
        </p>
      </Section>
      <Section title="7. Paid plans">
        <p>
          Seller plans, trials and any fees are described in the seller panel. See our{" "}
          <Link href="/refund-policy" className="text-blue-700 underline">Refund &amp; Cancellation Policy</Link>.
          Prices exclude GST unless stated.
        </p>
      </Section>
      <Section title="8. Beta and availability">
        <p>
          TradeKwik is in beta. Features may change, break or be removed without notice. We do our best to
          keep the service running but do not promise uninterrupted availability.
        </p>
      </Section>
      <Section title="9. Liability">
        <p>
          To the extent permitted by law, TradeKwik is not liable for losses arising from any transaction
          between a buyer and a seller, from a seller&apos;s or buyer&apos;s conduct, or from use of or inability to
          use the platform. Our total liability to you for any claim is limited to the fees you paid us in the
          preceding three months.
        </p>
      </Section>
      <Section title="10. Content you post">
        <p>
          You keep ownership of what you upload and give TradeKwik a licence to display it on the platform and
          in promotion of the platform. Do not upload content you do not have the right to share.
        </p>
      </Section>
      <Section title="11. Changes, law and disputes">
        <p>
          We may update these terms; the date at the top shows the current version. Indian law applies.
          Courts at {LEGAL.address} have jurisdiction, subject to any consumer-protection rights you have.
        </p>
      </Section>
    </LegalPage>
  );
}
