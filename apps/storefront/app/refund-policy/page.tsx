import type { Metadata } from "next";
import { LegalPage, Mail, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      intro="This policy covers fees paid to TradeKwik for seller plans. It does not cover purchases from sellers."
    >
      <Section title="Purchases from sellers">
        <p>
          TradeKwik does not collect payment for goods or services. Any advance, refund, replacement or
          cancellation for a product is between you and the seller, under the terms you agreed with them.
          Check the seller&apos;s stated payment and return terms on their About page before paying.
        </p>
      </Section>
      <Section title="Seller plans">
        <p>
          Seller plans are prepaid for a month or a year and begin only after the free trial. A plan can be
          cancelled at any time; it simply is not renewed and access continues until the end of the paid
          period.
        </p>
        <p>
          Plan fees are non-refundable once the period has started, except where required by law or where
          TradeKwik fails to provide the service for a prolonged period, in which case we will refund the
          unused portion on a pro-rata basis.
        </p>
        <p>If a plan was activated by mistake (wrong plan or duration), contact us within 7 days and we will correct it.</p>
      </Section>
      <Section title="How to request">
        <p>
          Email <Mail subject="Refund request" /> from your registered email or include your registered mobile
          number. Refunds, where applicable, are made to the original payment method within 10 working days.
        </p>
      </Section>
    </LegalPage>
  );
}
