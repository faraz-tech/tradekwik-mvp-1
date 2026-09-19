import { z } from "zod";

// ---------- plans ----------

export const PLANS = ["basic", "pro", "unlimited"] as const;
export type Plan = (typeof PLANS)[number];

export const BILLING_CYCLES = ["month", "year"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const PAYMENT_METHODS = ["upi", "bank_transfer", "cash", "razorpay", "complimentary", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PlanLimits {
  /** Max products (published or not); null = unlimited. */
  products: number | null;
  /** Max team logins incl. owner; null = unlimited. */
  teamMembers: number | null;
  /** Shown in "Featured sellers" and boosted in search. */
  featured: boolean;
  /** Verification desk reviews these first. */
  priorityVerification: boolean;
}

export interface PlanDefinition {
  id: Plan;
  name: string;
  tagline: string;
  /** INR, incl. nothing — GST added on the invoice. */
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  highlights: string[];
}

/** Single source of truth for pricing; the API enforces `limits`, the UIs render the rest. */
export const PLAN_DEFINITIONS: Record<Plan, PlanDefinition> = {
  basic: {
    id: "basic",
    name: "Basic",
    tagline: "For a single shop or workshop getting started online.",
    priceMonthly: 499,
    priceYearly: 4999,
    limits: { products: 25, teamMembers: 2, featured: false, priorityVerification: false },
    highlights: [
      "Up to 25 products",
      "2 team logins",
      "Company profile, owners & documents",
      "Order tracking with bilty for your buyers",
      "WhatsApp & phone leads, no commission",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For growing manufacturers and wholesalers.",
    priceMonthly: 1499,
    priceYearly: 14999,
    limits: { products: 100, teamMembers: 5, featured: true, priorityVerification: true },
    highlights: [
      "Up to 100 products",
      "5 team logins with roles",
      "Featured on home & category pages",
      "Priority document verification",
      "Everything in Basic",
    ],
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    tagline: "For large catalogues and multi-branch businesses.",
    priceMonthly: 2999,
    priceYearly: 29999,
    limits: { products: null, teamMembers: 20, featured: true, priorityVerification: true },
    highlights: [
      "Unlimited products",
      "20 team logins",
      "Featured placement everywhere",
      "Priority verification & support",
      "Everything in Pro",
    ],
  },
};

/** Days of full (Unlimited) access every newly approved seller gets. */
export const TRIAL_DAYS = 7;

export const SUBSCRIPTION_STATES = ["trial", "active", "expired", "none"] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

// ---------- DTOs ----------

export const subscriptionGrantSchema = z.object({
  id: z.uuid(),
  plan: z.enum(PLANS),
  cycle: z.enum(BILLING_CYCLES),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  amountPaid: z.number().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  reference: z.string().nullable(),
  note: z.string().nullable(),
  grantedByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type SubscriptionGrantDto = z.infer<typeof subscriptionGrantSchema>;

/** Effective subscription of a seller, as both seller and admin see it. */
export const sellerSubscriptionSchema = z.object({
  state: z.enum(SUBSCRIPTION_STATES),
  /** Plan whose limits currently apply (trial = unlimited). */
  effectivePlan: z.enum(PLANS).nullable(),
  /** Paid plan on record, if any (may be expired). */
  paidPlan: z.enum(PLANS).nullable(),
  trialEndsAt: z.iso.datetime().nullable(),
  currentPeriodEndsAt: z.iso.datetime().nullable(),
  daysLeft: z.number().int().nullable(),
  /** False once trial/plan has lapsed: reads allowed, writes blocked. */
  canWrite: z.boolean(),
  usage: z.object({
    products: z.number().int(),
    teamMembers: z.number().int(),
  }),
  history: z.array(subscriptionGrantSchema),
});
export type SellerSubscriptionDto = z.infer<typeof sellerSubscriptionSchema>;

/** POST /admin/sellers/:id/subscription — manual activation after offline payment. */
export const grantPlanSchema = z.object({
  plan: z.enum(PLANS),
  cycle: z.enum(BILLING_CYCLES),
  /** Defaults to now, or to the end of the current period if one is active (extension). */
  startsAt: z.iso.datetime().optional(),
  amountPaid: z.coerce.number().min(0).max(10000000).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default("upi"),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});
export type GrantPlanInput = z.infer<typeof grantPlanSchema>;

/** PATCH /admin/sellers/:id/subscription/trial — extend or reset the trial. */
export const extendTrialSchema = z.object({
  days: z.coerce.number().int().min(1).max(90),
});
export type ExtendTrialInput = z.infer<typeof extendTrialSchema>;
