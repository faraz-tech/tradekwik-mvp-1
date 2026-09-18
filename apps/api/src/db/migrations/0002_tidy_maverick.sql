CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'verifier', 'support');--> statement-breakpoint
CREATE TYPE "public"."buyer_verification_status" AS ENUM('unverified', 'phone_verified', 'business_verified');--> statement-breakpoint
CREATE TYPE "public"."freight_term" AS ENUM('to_pay', 'paid', 'included');--> statement-breakpoint
CREATE TYPE "public"."order_actor_type" AS ENUM('buyer', 'seller', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."registration_type" AS ENUM('proprietorship', 'partnership', 'llp', 'private_limited', 'other');--> statement-breakpoint
CREATE TYPE "public"."seller_kind" AS ENUM('manufacturer', 'wholesaler', 'retailer', 'service_provider');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('booked', 'in_transit', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."team_size_range" AS ENUM('1-5', '6-20', '21-50', '51-200', '200+');--> statement-breakpoint
ALTER TYPE "public"."order_request_status" ADD VALUE 'ready' BEFORE 'delivered';--> statement-breakpoint
ALTER TYPE "public"."order_request_status" ADD VALUE 'dispatched' BEFORE 'delivered';--> statement-breakpoint
ALTER TYPE "public"."order_request_status" ADD VALUE 'completed' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."seller_user_role" ADD VALUE 'manager';--> statement-breakpoint
ALTER TYPE "public"."seller_user_role" ADD VALUE 'sales';--> statement-breakpoint
ALTER TYPE "public"."seller_user_role" ADD VALUE 'catalogue';--> statement-breakpoint
ALTER TYPE "public"."seller_user_role" ADD VALUE 'logistics';--> statement-breakpoint
CREATE TABLE "buyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"buyer_type" "buyer_type" DEFAULT 'personal' NOT NULL,
	"company_name" text,
	"gstin" text,
	"city" text,
	"state" text,
	"default_address" text,
	"verification_status" "buyer_verification_status" DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_request_id" uuid NOT NULL,
	"status" "order_request_status",
	"actor_type" "order_actor_type" NOT NULL,
	"actor_id" uuid,
	"actor_name" text,
	"note" text,
	"visible_to_buyer" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"designation" text,
	"photo_url" text,
	"bio" text,
	"years_experience" integer,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_profiles" (
	"seller_id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text,
	"registration_type" "registration_type",
	"registration_year" integer,
	"udyam_number" text,
	"capacity_note" text,
	"lead_time_note" text,
	"payment_terms" text,
	"return_policy" text,
	"process_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"social_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"premises_photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_request_id" uuid NOT NULL,
	"status" "shipment_status" DEFAULT 'booked' NOT NULL,
	"transport_name" text NOT NULL,
	"transport_phone" text,
	"transport_branch" text,
	"lr_number" text NOT NULL,
	"lr_document_url" text,
	"vehicle_number" text,
	"driver_phone" text,
	"packages_count" integer,
	"dispatched_at" timestamp with time zone,
	"expected_delivery_on" date,
	"delivered_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_order_request_id_unique" UNIQUE("order_request_id")
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "buyer_id" uuid;--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "order_number" text DEFAULT 'TK-' || upper(substring(gen_random_uuid()::text from 1 for 8)) NOT NULL;--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "buyer_id" uuid;--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "inquiry_id" uuid;--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "transport_preference" text;--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "freight_term" "freight_term";--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "buyer_notes" text;--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "quoted_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "agreed_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "order_requests" ADD COLUMN "expected_delivery_on" date;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD COLUMN "role" "admin_role" DEFAULT 'super_admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "wholesale_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "seller_kind" "seller_kind" DEFAULT 'retailer' NOT NULL;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "founded_year" integer;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "team_size_range" "team_size_range";--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_request_id_order_requests_id_fk" FOREIGN KEY ("order_request_id") REFERENCES "public"."order_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_owners" ADD CONSTRAINT "seller_owners_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_request_id_order_requests_id_fk" FOREIGN KEY ("order_request_id") REFERENCES "public"."order_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyers_phone_idx" ON "buyers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_request_id","created_at");--> statement-breakpoint
CREATE INDEX "seller_owners_seller_idx" ON "seller_owners" USING btree ("seller_id");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiries_buyer_idx" ON "inquiries" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "order_requests_buyer_idx" ON "order_requests" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "sellers_kind_idx" ON "sellers" USING btree ("seller_kind");--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_order_number_unique" UNIQUE("order_number");