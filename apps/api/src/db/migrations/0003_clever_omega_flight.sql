CREATE TYPE "public"."document_kind" AS ENUM('gst_certificate', 'pan', 'udyam', 'incorporation', 'bank_proof', 'factory_license', 'trade_license', 'iso', 'bis', 'fssai', 'ce', 'owner_id', 'brochure', 'catalogue', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."buyer_verification_status" ADD VALUE 'review_pending' BEFORE 'business_verified';--> statement-breakpoint
CREATE TABLE "buyer_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "document_kind" NOT NULL,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"issued_on" date,
	"expires_on" date,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"buyer_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "document_kind" NOT NULL,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"issued_on" date,
	"expires_on" date,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seller_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyers" ADD COLUMN "verification_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyers" ADD COLUMN "verification_note" text;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyer_documents" ADD CONSTRAINT "buyer_documents_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_documents" ADD CONSTRAINT "seller_documents_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyer_documents_buyer_idx" ON "buyer_documents" USING btree ("buyer_id","status");--> statement-breakpoint
CREATE INDEX "seller_documents_seller_idx" ON "seller_documents" USING btree ("seller_id","status");