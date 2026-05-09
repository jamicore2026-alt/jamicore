ALTER TABLE "merchant_plans" ADD COLUMN "annual_price" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "annual_discount_percent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "max_orders_per_month" integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "transaction_fee" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "includes_custom_domain" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "includes_api_access" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "includes_white_label" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "support_level" text DEFAULT 'email';--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "trial_days" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "is_popular" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "merchant_plans" ADD COLUMN "sort_order" integer DEFAULT 0;