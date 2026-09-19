CREATE TYPE "public"."billing_cycle" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('upi', 'bank_transfer', 'cash', 'razorpay', 'complimentary', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('basic', 'pro', 'unlimited');--> statement-breakpoint
CREATE TABLE "subscription_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"plan" "plan" NOT NULL,
	"cycle" "billing_cycle" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"amount_paid" numeric(12, 2),
	"payment_method" "payment_method",
	"reference" text,
	"note" text,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_grants" ADD CONSTRAINT "subscription_grants_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_grants_seller_idx" ON "subscription_grants" USING btree ("seller_id","ends_at");