import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DOCUMENT_KIND_LABELS,
  REGISTRATION_TYPE_LABELS,
  SOCIAL_PLATFORM_LABELS,
  type SocialPlatform,
} from "@tradekwik/shared";
import { getSellerAbout } from "@/lib/api";
import { waLink, youtubeId } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";
import { SellerKindBadge } from "@/components/seller-kind-badge";
import { ShareButton } from "@/components/share-button";
import { SellerContact } from "@/components/seller-contact";

export const revalidate = 300;

interface AboutPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { sellerSlug } = await params;
  const about = await getSellerAbout(sellerSlug);
  if (!about) return {};
  const { seller } = about;
  return {
    title: `About ${seller.businessName} — company, people & process`,
    description:
      seller.description ??
      `${seller.businessName}, ${seller.city}: company details, process and the people behind the business.`,
    alternates: { canonical: `/store/${seller.slug}/about` },
  };
}

const socialIcon: Record<SocialPlatform, string> = {
  website: "🌐",
  youtube: "▶️",
  instagram: "📸",
  facebook: "📘",
  linkedin: "💼",
  x: "𝕏",
  whatsapp_catalogue: "🟢",
  indiamart: "🏭",
  justdial: "📒",
};

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="text-sm text-stone-800">{value}</dd>
    </div>
  );
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { sellerSlug } = await params;
  const about = await getSellerAbout(sellerSlug);
  if (!about) notFound();
  const { seller, company, owners, trust } = about;

  const pageUrl = absoluteUrl(`/store/${seller.slug}/about`);
  const waText = `Hi, I found ${seller.businessName} on TradeKwik. ${absoluteUrl(`/store/${seller.slug}`)}`;
  const hasCompanyFacts =
    company.legalName || company.registrationType || company.registrationYear || company.udyamNumber || company.gstinMasked;
  const hasTerms = company.capacityNote || company.leadTimeNote || company.paymentTerms || company.returnPolicy;
  const videos = company.videos
    .map((v) => ({ ...v, id: youtubeId(v.url) }))
    .filter((v): v is typeof v & { id: string } => Boolean(v.id));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
        <Link href={`/store/${seller.slug}`} className="hover:text-blue-700">
          {seller.businessName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-700">About</span>
      </nav>

      <header className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">{seller.businessName}</h1>
          <SellerKindBadge kind={seller.sellerKind} />
          {seller.isVerified && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              ✓ Verified seller
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {seller.city}, {seller.state}
          {seller.foundedYear && ` · Since ${seller.foundedYear}`}
          {seller.teamSizeRange && ` · ${seller.teamSizeRange} people`}
        </p>
        {seller.description && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-700">{seller.description}</p>}

        {company.socialLinks.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {company.socialLinks.map((link) => (
              <li key={`${link.platform}-${link.url}`}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-blue-400 hover:text-blue-700"
                >
                  <span aria-hidden>{socialIcon[link.platform]}</span>
                  {SOCIAL_PLATFORM_LABELS[link.platform]}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/store/${seller.slug}#inquiry`} className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            Send inquiry
          </Link>
          <SellerContact sellerSlug={seller.slug} message={waText} />
          <ShareButton url={pageUrl} title={seller.businessName} text={`Check out ${seller.businessName} (${seller.city}) on TradeKwik.`} />
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-8">
          {owners.length > 0 && (
            <section aria-labelledby="people">
              <h2 id="people" className="text-lg font-semibold text-stone-900">The people behind the business</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {owners.map((owner) => (
                  <article key={owner.id} className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    {owner.photoUrl ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-stone-100">
                        <Image src={owner.photoUrl} alt={owner.fullName} fill sizes="64px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl font-semibold text-stone-500">
                        {owner.fullName.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900">{owner.fullName}</p>
                      <p className="text-sm text-stone-500">
                        {[owner.designation, owner.yearsExperience != null ? `${owner.yearsExperience} years experience` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {owner.bio && <p className="mt-2 text-sm leading-relaxed text-stone-700">{owner.bio}</p>}
                      {owner.languages.length > 0 && (
                        <p className="mt-2 text-xs text-stone-500">Speaks {owner.languages.join(", ")}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {company.processSteps.length > 0 && (
            <section aria-labelledby="process">
              <h2 id="process" className="text-lg font-semibold text-stone-900">How we work</h2>
              <ol className="mt-4 grid gap-3">
                {company.processSteps.map((step, index) => (
                  <li key={index} className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-stone-900">{step.title}</p>
                      {step.description && <p className="mt-1 text-sm text-stone-700">{step.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {videos.length > 0 && (
            <section aria-labelledby="watch">
              <h2 id="watch" className="text-lg font-semibold text-stone-900">Watch</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {videos.map((video) => (
                  <figure key={video.id} className="overflow-hidden rounded-xl border border-stone-200 bg-black shadow-sm">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                      title={video.title ?? "Video"}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full"
                    />
                    {video.title && <figcaption className="bg-white px-3 py-2 text-sm text-stone-700">{video.title}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {company.premisesPhotos.length > 0 && (
            <section aria-labelledby="premises">
              <h2 id="premises" className="text-lg font-semibold text-stone-900">Our premises</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {company.premisesPhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                    <Image src={photo.url} alt={photo.alt ?? ""} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="grid content-start gap-6">
          <section className={`rounded-xl border p-5 shadow-sm ${trust.isVerified ? "border-green-200 bg-green-50/40" : "border-stone-200 bg-white"}`}>
            <h2 className="text-base font-semibold text-stone-900">
              {trust.isVerified ? "✓ Verified by TradeKwik" : "Verification in progress"}
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              {trust.isVerified
                ? `Business documents checked by the TradeKwik verification desk${trust.verifiedAt ? ` on ${new Date(trust.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}.`
                : "This seller has not completed document verification yet. Ask for GST and registration details before paying an advance."}
            </p>
            {trust.verifiedKinds.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {trust.verifiedKinds.map((kind) => (
                  <li key={kind} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-green-800 ring-1 ring-green-200">
                    ✓ {DOCUMENT_KIND_LABELS[kind]}
                  </li>
                ))}
              </ul>
            )}
            {trust.publicDocuments.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Documents</p>
                <ul className="mt-1 grid gap-1">
                  {trust.publicDocuments.map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-blue-700 hover:underline">
                        {doc.title}
                      </a>
                      <span className="ml-1 text-xs text-stone-500">({DOCUMENT_KIND_LABELS[doc.kind]}{doc.issuedOn ? `, ${doc.issuedOn}` : ""})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {hasCompanyFacts && (
            <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-stone-900">Company details</h2>
              <dl className="mt-3 grid gap-3">
                <Fact label="Legal name" value={company.legalName} />
                <Fact label="Registration" value={company.registrationType ? REGISTRATION_TYPE_LABELS[company.registrationType] : null} />
                <Fact label="Registered in" value={company.registrationYear} />
                <Fact label="GSTIN" value={company.gstinMasked} />
                <Fact label="Udyam / MSME" value={company.udyamNumber} />
                <Fact label="Address" value={seller.address} />
              </dl>
              <p className="mt-3 text-xs text-stone-500">GSTIN is partly masked. Full details are shared on request.</p>
            </section>
          )}

          {hasTerms && (
            <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-stone-900">Capacity & terms</h2>
              <dl className="mt-3 grid gap-3">
                <Fact label="Capacity" value={company.capacityNote} />
                <Fact label="Lead time" value={company.leadTimeNote} />
                <Fact label="Payment terms" value={company.paymentTerms} />
                <Fact label="Warranty / returns" value={company.returnPolicy} />
              </dl>
            </section>
          )}

          <Link href={`/store/${seller.slug}`} className="text-sm font-medium text-blue-700 hover:underline">
            ← Back to catalogue
          </Link>
        </aside>
      </div>
    </main>
  );
}
