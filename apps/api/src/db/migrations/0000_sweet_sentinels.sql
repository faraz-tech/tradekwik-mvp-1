CREATE TYPE "public"."buyer_type" AS ENUM('personal', 'business');--> statement-breakpoint
CREATE TYPE "public"."inquiry_source" AS ENUM('product_page', 'store_page', 'search');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'contacted', 'quoted', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."order_request_status" AS ENUM('new', 'confirmed', 'in_progress', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('retail', 'bulk', 'booking');--> statement-breakpoint
CREATE TYPE "public"."seller_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."seller_user_role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('in_stock', 'made_to_order', 'out_of_stock');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_id" uuid,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"buyer_city" text,
	"buyer_type" "buyer_type" DEFAULT 'personal' NOT NULL,
	"quantity" integer,
	"message" text NOT NULL,
	"source" "inquiry_source" DEFAULT 'product_page' NOT NULL,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"seller_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"delivery_address" text NOT NULL,
	"order_type" "order_type" DEFAULT 'retail' NOT NULL,
	"event_date" date,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "order_request_status" DEFAULT 'new' NOT NULL,
	"seller_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_retail" numeric(12, 2),
	"price_bulk" numeric(12, 2),
	"min_bulk_qty" integer,
	"price_on_request" boolean DEFAULT false NOT NULL,
	"stock_status" "stock_status" DEFAULT 'in_stock' NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" "seller_user_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"business_name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"description" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"address" text,
	"phone" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"email" text,
	"logo_url" text,
	"cover_image_url" text,
	"gst_number" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"status" "seller_status" DEFAULT 'pending' NOT NULL,
	"serves_pan_india" boolean DEFAULT false NOT NULL,
	"delivery_radius_km" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sellers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_users" ADD CONSTRAINT "seller_users_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiries_seller_status_idx" ON "inquiries" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "order_requests_seller_status_idx" ON "order_requests" USING btree ("seller_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "products_seller_slug_idx" ON "products" USING btree ("seller_id","slug");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sellers_status_idx" ON "sellers" USING btree ("status");