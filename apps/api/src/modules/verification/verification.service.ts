import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import {
  PRIVATE_DOCUMENT_KINDS,
  SELLER_DOCUMENT_REQUIREMENTS,
  type AdminBuyerVerificationDto,
  type AdminSellerVerificationDto,
  type BuyerVerificationDto,
  type ChecklistItemDto,
  type CreateBuyerDocumentInput,
  type CreateDocumentInput,
  type DocumentDto,
  type DocumentKind,
  type ReviewBuyerInput,
  type ReviewDocumentInput,
  type SellerVerificationDto,
  type UpdateDocumentInput,
  type VerificationQueueDto,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  buyerDocuments,
  buyers,
  sellerDocuments,
  sellers,
  type Buyer,
  type Seller,
  type SellerDocument,
} from '../../db/schema.js';
import { toDocumentDto } from '../../common/mappers.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const DAY = 24 * 60 * 60 * 1000;

/** Rank so the "best" document of a kind wins: verified > pending > rejected, newest first. */
const STATUS_RANK = { verified: 0, pending: 1, rejected: 2 } as const;

function pickBest(docs: SellerDocument[]): SellerDocument | null {
  if (docs.length === 0) return null;
  return [...docs].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
}

function isExpired(doc: { expiresOn: string | null }): boolean {
  return Boolean(doc.expiresOn && new Date(doc.expiresOn).getTime() < Date.now());
}

@Injectable()
export class VerificationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  // ================= seller side =================

  async sellerOverview(sellerId: string): Promise<SellerVerificationDto> {
    const seller = await this.requireSeller(sellerId);
    const docs = await this.sellerDocs(sellerId);
    const { checklist, missingRequired } = this.buildChecklist(seller, docs);
    return {
      sellerKind: seller.sellerKind,
      isVerified: seller.isVerified,
      verifiedAt: seller.verifiedAt ? seller.verifiedAt.toISOString() : null,
      missingRequired,
      pendingReview: docs.filter((d) => d.status === 'pending').length,
      checklist,
      documents: docs.map(toDocumentDto),
    };
  }

  async addSellerDocument(sellerId: string, input: CreateDocumentInput): Promise<SellerVerificationDto> {
    if (input.isPublic && PRIVATE_DOCUMENT_KINDS.includes(input.kind)) {
      throw new BadRequestException('Identity and banking documents cannot be made public.');
    }
    await this.db.insert(sellerDocuments).values({ sellerId, ...input, status: 'pending' });
    // A new upload of a required kind means the badge needs re-evaluation (never auto-revokes here).
    return this.sellerOverview(sellerId);
  }

  async updateSellerDocument(
    sellerId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ): Promise<SellerVerificationDto> {
    const [doc] = await this.db
      .select()
      .from(sellerDocuments)
      .where(and(eq(sellerDocuments.id, documentId), eq(sellerDocuments.sellerId, sellerId)))
      .limit(1);
    if (!doc) throw new NotFoundException('Document not found.');
    if (input.isPublic && PRIVATE_DOCUMENT_KINDS.includes(doc.kind)) {
      throw new BadRequestException('Identity and banking documents cannot be made public.');
    }
    await this.db.update(sellerDocuments).set(input).where(eq(sellerDocuments.id, documentId));
    return this.sellerOverview(sellerId);
  }

  async removeSellerDocument(sellerId: string, documentId: string): Promise<SellerVerificationDto> {
    const [doc] = await this.db
      .select()
      .from(sellerDocuments)
      .where(and(eq(sellerDocuments.id, documentId), eq(sellerDocuments.sellerId, sellerId)))
      .limit(1);
    if (!doc) throw new NotFoundException('Document not found.');
    await this.db.delete(sellerDocuments).where(eq(sellerDocuments.id, documentId));
    if (doc.status === 'verified') await this.recomputeSellerBadge(sellerId);
    return this.sellerOverview(sellerId);
  }

  // ================= buyer side =================

  async buyerOverview(buyerId: string): Promise<BuyerVerificationDto> {
    const buyer = await this.requireBuyer(buyerId);
    const docs = await this.db
      .select()
      .from(buyerDocuments)
      .where(eq(buyerDocuments.buyerId, buyerId))
      .orderBy(desc(buyerDocuments.createdAt));
    return {
      status: buyer.verificationStatus,
      requestedAt: buyer.verificationRequestedAt ? buyer.verificationRequestedAt.toISOString() : null,
      reviewNote: buyer.verificationNote,
      missing: this.buyerMissing(buyer, docs.map((d) => d.kind)),
      documents: docs.map(toDocumentDto),
    };
  }

  async addBuyerDocument(buyerId: string, input: CreateBuyerDocumentInput): Promise<BuyerVerificationDto> {
    await this.db.insert(buyerDocuments).values({ buyerId, ...input, isPublic: false, status: 'pending' });
    return this.buyerOverview(buyerId);
  }

  async removeBuyerDocument(buyerId: string, documentId: string): Promise<BuyerVerificationDto> {
    const deleted = await this.db
      .delete(buyerDocuments)
      .where(and(eq(buyerDocuments.id, documentId), eq(buyerDocuments.buyerId, buyerId)))
      .returning({ id: buyerDocuments.id });
    if (deleted.length === 0) throw new NotFoundException('Document not found.');
    return this.buyerOverview(buyerId);
  }

  /** Buyer asks for the verified business buyer badge. */
  async requestBuyerReview(buyerId: string): Promise<BuyerVerificationDto> {
    const overview = await this.buyerOverview(buyerId);
    if (overview.status === 'business_verified') {
      throw new BadRequestException('You are already a verified business buyer.');
    }
    if (overview.missing.length > 0) {
      throw new BadRequestException(`Please complete: ${overview.missing.join(', ')}.`);
    }
    await this.db
      .update(buyers)
      .set({ verificationStatus: 'review_pending', verificationRequestedAt: new Date(), verificationNote: null })
      .where(eq(buyers.id, buyerId));
    return this.buyerOverview(buyerId);
  }

  private buyerMissing(buyer: Buyer, kinds: DocumentKind[]): string[] {
    const missing: string[] = [];
    if (!buyer.companyName) missing.push('company name');
    if (!buyer.gstin) missing.push('GSTIN');
    if (!kinds.includes('gst_certificate')) missing.push('GST certificate upload');
    return missing;
  }

  // ================= admin side =================

  async queue(): Promise<VerificationQueueDto> {
    const [pendingSellerDocs, pendingBuyers] = await Promise.all([
      this.db
        .select({ sellerId: sellerDocuments.sellerId })
        .from(sellerDocuments)
        .where(eq(sellerDocuments.status, 'pending')),
      this.db.select().from(buyers).where(eq(buyers.verificationStatus, 'review_pending')),
    ]);

    // sellers with pending docs, plus active-but-unverified sellers (so verifiers see who is missing what)
    const unverified = await this.db
      .select({ id: sellers.id })
      .from(sellers)
      .where(and(eq(sellers.status, 'active'), eq(sellers.isVerified, false)));
    const sellerIds = [...new Set([...pendingSellerDocs.map((d) => d.sellerId), ...unverified.map((s) => s.id)])];

    const sellerRows = sellerIds.length
      ? await Promise.all(sellerIds.map((id) => this.adminSeller(id)))
      : [];
    sellerRows.sort((a, b) => b.pendingCount - a.pendingCount);

    const buyerRows = await Promise.all(pendingBuyers.map((b) => this.adminBuyer(b)));
    return { sellers: sellerRows, buyers: buyerRows };
  }

  async adminSeller(sellerId: string): Promise<AdminSellerVerificationDto> {
    const seller = await this.requireSeller(sellerId);
    const docs = await this.sellerDocs(sellerId);
    const { missingRequired } = this.buildChecklist(seller, docs);
    const soon = Date.now() + 30 * DAY;
    return {
      sellerId: seller.id,
      businessName: seller.businessName,
      slug: seller.slug,
      sellerKind: seller.sellerKind,
      isVerified: seller.isVerified,
      pendingCount: docs.filter((d) => d.status === 'pending').length,
      missingRequired,
      expiringSoon: docs.filter(
        (d) => d.status === 'verified' && d.expiresOn && new Date(d.expiresOn).getTime() < soon,
      ).length,
      documents: docs.map(toDocumentDto),
    };
  }

  async reviewSellerDocument(
    documentId: string,
    adminId: string,
    input: ReviewDocumentInput,
  ): Promise<AdminSellerVerificationDto> {
    const [doc] = await this.db.select().from(sellerDocuments).where(eq(sellerDocuments.id, documentId)).limit(1);
    if (!doc) throw new NotFoundException('Document not found.');
    await this.db
      .update(sellerDocuments)
      .set({
        status: input.status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: input.status === 'rejected' ? (input.rejectionReason ?? null) : null,
      })
      .where(eq(sellerDocuments.id, documentId));

    const becameVerified = await this.recomputeSellerBadge(doc.sellerId);
    const seller = await this.requireSeller(doc.sellerId);
    if (input.status === 'rejected') {
      await this.notifications.sendWhatsApp(
        seller.whatsappNumber,
        `[TradeKwik] Your document "${doc.title}" was not accepted: ${input.rejectionReason}. Please upload a corrected copy in your seller panel.`,
      );
    } else if (becameVerified) {
      await this.notifications.sendWhatsApp(
        seller.whatsappNumber,
        `[TradeKwik] Congratulations — ${seller.businessName} is now a Verified seller. The badge is live on your store.`,
      );
    }
    return this.adminSeller(doc.sellerId);
  }

  async reviewBuyer(buyerId: string, adminId: string, input: ReviewBuyerInput): Promise<AdminBuyerVerificationDto> {
    const buyer = await this.requireBuyer(buyerId);
    const approve = input.decision === 'approve';
    await this.db
      .update(buyers)
      .set({
        verificationStatus: approve ? 'business_verified' : 'phone_verified',
        verificationNote: input.note ?? null,
      })
      .where(eq(buyers.id, buyerId));
    await this.db
      .update(buyerDocuments)
      .set({ status: approve ? 'verified' : 'rejected', reviewedBy: adminId, reviewedAt: new Date() })
      .where(and(eq(buyerDocuments.buyerId, buyerId), eq(buyerDocuments.status, 'pending')));
    await this.notifications.sendWhatsApp(
      buyer.phone,
      approve
        ? '[TradeKwik] You are now a Verified business buyer. Sellers will see the badge on your inquiries.'
        : `[TradeKwik] Your business verification was not approved${input.note ? `: ${input.note}` : ''}. You can update your details and request again.`,
    );
    return this.adminBuyer(await this.requireBuyer(buyerId));
  }

  private async adminBuyer(buyer: Buyer): Promise<AdminBuyerVerificationDto> {
    const docs = await this.db
      .select()
      .from(buyerDocuments)
      .where(eq(buyerDocuments.buyerId, buyer.id))
      .orderBy(desc(buyerDocuments.createdAt));
    return {
      buyerId: buyer.id,
      fullName: buyer.fullName,
      phone: buyer.phone,
      companyName: buyer.companyName,
      gstin: buyer.gstin,
      city: buyer.city,
      status: buyer.verificationStatus,
      requestedAt: buyer.verificationRequestedAt ? buyer.verificationRequestedAt.toISOString() : null,
      documents: docs.map(toDocumentDto),
    };
  }

  // ================= shared =================

  /**
   * Verified badge = every required document kind for the seller's kind has a
   * verified, non-expired upload. Returns true when the badge was just granted.
   */
  async recomputeSellerBadge(sellerId: string): Promise<boolean> {
    const seller = await this.requireSeller(sellerId);
    const docs = await this.sellerDocs(sellerId);
    const { missingRequired } = this.buildChecklist(seller, docs);
    const shouldBeVerified = missingRequired.length === 0;
    if (shouldBeVerified === seller.isVerified) return false;
    await this.db
      .update(sellers)
      .set({ isVerified: shouldBeVerified, verifiedAt: shouldBeVerified ? new Date() : null })
      .where(eq(sellers.id, sellerId));
    return shouldBeVerified;
  }

  private buildChecklist(
    seller: Seller,
    docs: SellerDocument[],
  ): { checklist: ChecklistItemDto[]; missingRequired: DocumentKind[] } {
    const requirements = SELLER_DOCUMENT_REQUIREMENTS[seller.sellerKind];
    const byKind = new Map<DocumentKind, SellerDocument[]>();
    for (const doc of docs) byKind.set(doc.kind, [...(byKind.get(doc.kind) ?? []), doc]);

    const checklist: ChecklistItemDto[] = requirements.map((req) => ({
      kind: req.kind,
      required: req.required,
      document: (() => {
        const best = pickBest(byKind.get(req.kind) ?? []);
        return best ? toDocumentDto(best) : null;
      })(),
    }));
    // extra uploads outside the checklist still show
    for (const [kind, list] of byKind) {
      if (!requirements.some((r) => r.kind === kind)) {
        const best = pickBest(list);
        checklist.push({ kind, required: false, document: best ? toDocumentDto(best) : null });
      }
    }

    const missingRequired = requirements
      .filter((r) => r.required)
      .filter((r) => {
        const best = pickBest(byKind.get(r.kind) ?? []);
        return !best || best.status !== 'verified' || isExpired(best);
      })
      .map((r) => r.kind);

    return { checklist, missingRequired };
  }

  private sellerDocs(sellerId: string): Promise<SellerDocument[]> {
    return this.db
      .select()
      .from(sellerDocuments)
      .where(eq(sellerDocuments.sellerId, sellerId))
      .orderBy(asc(sellerDocuments.kind), desc(sellerDocuments.createdAt));
  }

  private async requireSeller(sellerId: string): Promise<Seller> {
    const [seller] = await this.db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
    if (!seller) throw new NotFoundException('Seller not found.');
    return seller;
  }

  private async requireBuyer(buyerId: string): Promise<Buyer> {
    const [buyer] = await this.db.select().from(buyers).where(eq(buyers.id, buyerId)).limit(1);
    if (!buyer) throw new NotFoundException('Buyer not found.');
    return buyer;
  }

  /** Used by the admin sellers list to flag docs needing attention. */
  async pendingCountsBySeller(sellerIds: string[]): Promise<Map<string, number>> {
    if (sellerIds.length === 0) return new Map();
    const rows = await this.db
      .select({ sellerId: sellerDocuments.sellerId })
      .from(sellerDocuments)
      .where(and(inArray(sellerDocuments.sellerId, sellerIds), or(eq(sellerDocuments.status, 'pending'))));
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.sellerId, (map.get(row.sellerId) ?? 0) + 1);
    return map;
  }
}
