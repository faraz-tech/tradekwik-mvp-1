import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import {
  PLAN_DEFINITIONS,
  TRIAL_DAYS,
  type ExtendTrialInput,
  type GrantPlanInput,
  type Plan,
  type PlanLimits,
  type SellerSubscriptionDto,
  type SubscriptionGrantDto,
  type SubscriptionState,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  platformAdmins,
  products,
  sellerUsers,
  sellers,
  subscriptionGrants,
  type Seller,
  type SubscriptionGrant,
} from '../../db/schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trial = full access. */
const TRIAL_LIMITS: PlanLimits = PLAN_DEFINITIONS.unlimited.limits;

export interface EffectiveSubscription {
  state: SubscriptionState;
  effectivePlan: Plan | null;
  paidPlan: Plan | null;
  limits: PlanLimits | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  canWrite: boolean;
}

function toGrantDto(row: SubscriptionGrant, grantedByName: string | null): SubscriptionGrantDto {
  return {
    id: row.id,
    plan: row.plan,
    cycle: row.cycle,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    amountPaid: row.amountPaid,
    paymentMethod: row.paymentMethod,
    reference: row.reference,
    note: row.note,
    grantedByName,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class BillingService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Start the trial clock (idempotent). Called when a seller is approved. */
  async startTrialIfNeeded(sellerId: string): Promise<void> {
    await this.db
      .update(sellers)
      .set({ trialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY_MS) })
      .where(and(eq(sellers.id, sellerId), eq(sellers.status, 'active'), isNullTrial()));
  }

  /** What applies right now: paid plan > trial > expired. */
  async effective(sellerId: string): Promise<EffectiveSubscription> {
    const [seller] = await this.db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
    if (!seller) throw new NotFoundException('Seller not found.');
    return this.effectiveFor(seller);
  }

  async effectiveFor(seller: Seller): Promise<EffectiveSubscription> {
    const now = new Date();
    const [activeGrant] = await this.db
      .select()
      .from(subscriptionGrants)
      .where(and(eq(subscriptionGrants.sellerId, seller.id), gt(subscriptionGrants.endsAt, now)))
      .orderBy(desc(subscriptionGrants.endsAt))
      .limit(1);
    const [latestGrant] = activeGrant
      ? [activeGrant]
      : await this.db
          .select()
          .from(subscriptionGrants)
          .where(eq(subscriptionGrants.sellerId, seller.id))
          .orderBy(desc(subscriptionGrants.endsAt))
          .limit(1);

    if (activeGrant) {
      return {
        state: 'active',
        effectivePlan: activeGrant.plan,
        paidPlan: activeGrant.plan,
        limits: PLAN_DEFINITIONS[activeGrant.plan].limits,
        trialEndsAt: seller.trialEndsAt,
        currentPeriodEndsAt: activeGrant.endsAt,
        canWrite: true,
      };
    }
    if (seller.trialEndsAt && seller.trialEndsAt > now) {
      return {
        state: 'trial',
        effectivePlan: 'unlimited',
        paidPlan: latestGrant?.plan ?? null,
        limits: TRIAL_LIMITS,
        trialEndsAt: seller.trialEndsAt,
        currentPeriodEndsAt: seller.trialEndsAt,
        canWrite: true,
      };
    }
    return {
      state: seller.trialEndsAt || latestGrant ? 'expired' : 'none',
      effectivePlan: null,
      paidPlan: latestGrant?.plan ?? null,
      limits: null,
      trialEndsAt: seller.trialEndsAt,
      currentPeriodEndsAt: latestGrant?.endsAt ?? seller.trialEndsAt,
      canWrite: false,
    };
  }

  /** Full DTO for the seller's Billing page and the admin dialog. */
  async summary(sellerId: string): Promise<SellerSubscriptionDto> {
    const eff = await this.effective(sellerId);
    const [[prod], [team], history] = await Promise.all([
      this.db.select({ value: count() }).from(products).where(eq(products.sellerId, sellerId)),
      this.db.select({ value: count() }).from(sellerUsers).where(eq(sellerUsers.sellerId, sellerId)),
      this.db
        .select({ grant: subscriptionGrants, adminName: platformAdmins.name })
        .from(subscriptionGrants)
        .leftJoin(platformAdmins, eq(subscriptionGrants.grantedBy, platformAdmins.id))
        .where(eq(subscriptionGrants.sellerId, sellerId))
        .orderBy(desc(subscriptionGrants.createdAt)),
    ]);
    const end = eff.currentPeriodEndsAt;
    return {
      state: eff.state,
      effectivePlan: eff.effectivePlan,
      paidPlan: eff.paidPlan,
      trialEndsAt: eff.trialEndsAt ? eff.trialEndsAt.toISOString() : null,
      currentPeriodEndsAt: end ? end.toISOString() : null,
      daysLeft: end && eff.canWrite ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS)) : null,
      canWrite: eff.canWrite,
      usage: { products: prod.value, teamMembers: team.value },
      history: history.map(({ grant, adminName }) => toGrantDto(grant, adminName)),
    };
  }

  // ---------- limit checks used by seller services ----------

  async assertCanWrite(sellerId: string): Promise<EffectiveSubscription> {
    const eff = await this.effective(sellerId);
    if (!eff.canWrite) {
      throw new BadRequestException(
        eff.state === 'expired'
          ? 'Your trial or plan has ended. Activate a plan from Billing to continue editing your store.'
          : 'Your store is not active yet. You will be able to edit once it is approved.',
      );
    }
    return eff;
  }

  async assertCanAddProduct(sellerId: string): Promise<void> {
    const eff = await this.assertCanWrite(sellerId);
    const max = eff.limits?.products ?? null;
    if (max === null) return;
    const [{ value }] = await this.db.select({ value: count() }).from(products).where(eq(products.sellerId, sellerId));
    if (value >= max) {
      throw new BadRequestException(
        `Your ${PLAN_DEFINITIONS[eff.effectivePlan!].name} plan allows ${max} products. Upgrade from Billing to add more.`,
      );
    }
  }

  async assertCanAddTeamMember(sellerId: string): Promise<void> {
    const eff = await this.assertCanWrite(sellerId);
    const max = eff.limits?.teamMembers ?? null;
    if (max === null) return;
    const [{ value }] = await this.db.select({ value: count() }).from(sellerUsers).where(eq(sellerUsers.sellerId, sellerId));
    if (value >= max) {
      throw new BadRequestException(
        `Your ${PLAN_DEFINITIONS[eff.effectivePlan!].name} plan allows ${max} team logins. Upgrade from Billing to add more.`,
      );
    }
  }

  // ---------- admin ----------

  /** Manual activation after an offline payment. Extends an active period instead of overlapping it. */
  async grant(sellerId: string, adminId: string, input: GrantPlanInput): Promise<SellerSubscriptionDto> {
    const eff = await this.effective(sellerId);
    const start = input.startsAt
      ? new Date(input.startsAt)
      : eff.state === 'active' && eff.currentPeriodEndsAt
        ? eff.currentPeriodEndsAt
        : new Date();
    const end = new Date(start);
    if (input.cycle === 'month') end.setMonth(end.getMonth() + 1);
    else end.setFullYear(end.getFullYear() + 1);

    await this.db.insert(subscriptionGrants).values({
      sellerId,
      plan: input.plan,
      cycle: input.cycle,
      startsAt: start,
      endsAt: end,
      amountPaid: input.amountPaid ?? null,
      paymentMethod: input.paymentMethod,
      reference: input.reference ?? null,
      note: input.note ?? null,
      grantedBy: adminId,
    });
    return this.summary(sellerId);
  }

  async extendTrial(sellerId: string, input: ExtendTrialInput): Promise<SellerSubscriptionDto> {
    const [seller] = await this.db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
    if (!seller) throw new NotFoundException('Seller not found.');
    const base = seller.trialEndsAt && seller.trialEndsAt > new Date() ? seller.trialEndsAt : new Date();
    await this.db
      .update(sellers)
      .set({ trialEndsAt: new Date(base.getTime() + input.days * DAY_MS) })
      .where(eq(sellers.id, sellerId));
    return this.summary(sellerId);
  }

  async revokeGrant(sellerId: string, grantId: string): Promise<SellerSubscriptionDto> {
    const deleted = await this.db
      .delete(subscriptionGrants)
      .where(and(eq(subscriptionGrants.id, grantId), eq(subscriptionGrants.sellerId, sellerId)))
      .returning({ id: subscriptionGrants.id });
    if (deleted.length === 0) throw new NotFoundException('Grant not found.');
    return this.summary(sellerId);
  }
}

function isNullTrial() {
  return isNull(sellers.trialEndsAt);
}
