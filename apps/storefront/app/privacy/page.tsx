import type { Metadata } from "next";
import { LEGAL, LegalPage, Mail, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What we collect, why, and who can see it. Written to be understood, not to hide anything."
    >
      <Section title="What we collect">
        <p>
          <strong>Buyers:</strong> name, mobile number, optional email, city/state, company name and GSTIN if
          you are a business, delivery addresses, and the inquiries and orders you place.
        </p>
        <p>
          <strong>Sellers:</strong> business details, contact numbers, the people and process information you
          choose to publish, product listings, and compliance documents such as GST certificate, PAN,
          licences, bank proof and owner ID that you upload for verification.
        </p>
        <p>
          <strong>Everyone:</strong> OTP records (the code is stored hashed, never in plain text), login
          timestamps, the IP address used for rate limiting, and standard server logs.
        </p>
      </Section>
      <Section title="Why we use it">
        <p>
          To run the platform: show listings, connect buyers with sellers, verify sellers, track orders, send
          transactional messages (OTP, order updates, approval), prevent abuse, and comply with the law. We do
          not sell your data and do not show third-party advertising.
        </p>
      </Section>
      <Section title="Who can see what">
        <p>
          <strong>Public:</strong> a seller&apos;s store, products, company profile and the documents the seller
          has chosen to make public. GSTIN is shown partly masked.
        </p>
        <p>
          <strong>Sellers see:</strong> the name, mobile number, city and message of buyers who contact them,
          plus a verification badge if the buyer is verified.
        </p>
        <p>
          <strong>Only TradeKwik staff see:</strong> private compliance documents (PAN, bank proof, owner ID),
          buyer verification documents, and internal notes. These are used solely for verification and are
          never published or shared with other users.
        </p>
        <p>
          <strong>Service providers:</strong> our hosting, database, SMS/OTP and email providers process data on
          our behalf under contract.
        </p>
      </Section>
      <Section title="Sensitive documents">
        <p>
          Identity and banking documents are marked private in our system and cannot be made public by anyone.
          They are retained only as long as needed for verification and legal record-keeping. You may ask us
          to delete them once verification is complete, subject to legal retention duties.
        </p>
      </Section>
      <Section title="Messages">
        <p>
          We send OTPs and transactional updates by SMS, WhatsApp or email to the number or address you gave.
          We do not send marketing without your consent.
        </p>
      </Section>
      <Section title="Cookies">
        <p>
          We use a login cookie to keep you signed in, and browser storage for small conveniences such as
          remembering a tab. No advertising or cross-site tracking cookies.
        </p>
      </Section>
      <Section title="Your rights">
        <p>
          You can view and edit your details in your account. You can ask us to correct or delete your account
          and data by emailing <Mail subject="Data request" />. We respond within 30 days. Some records (for
          example payment history) may need to be kept as required by Indian law.
        </p>
      </Section>
      <Section title="Security">
        <p>
          Passwords are hashed, OTPs are hashed and short-lived, and access to private documents is limited to
          authorised staff. No system is perfectly secure; if we learn of a breach affecting you, we will
          inform you.
        </p>
      </Section>
      <Section title="Children">
        <p>
          TradeKwik is for adults running or buying for a business or household. We do not knowingly collect
          data from anyone under 18.
        </p>
      </Section>
      <Section title="Contact & changes">
        <p>
          Data controller: {LEGAL.entity}, {LEGAL.address}. Email <Mail subject="Privacy" />. We will update
          this page as the platform grows; the date at the top shows the current version.
        </p>
      </Section>
    </LegalPage>
  );
}
