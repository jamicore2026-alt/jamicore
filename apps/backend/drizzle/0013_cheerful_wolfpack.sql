CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "store_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "inventory_alert_threshold" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupon_usages_coupon_id_idx" ON "coupon_usages" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "product_variant_combinations_product_id_idx" ON "product_variant_combinations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variant_combinations_store_id_idx" ON "product_variant_combinations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "subcategories_store_id_idx" ON "subcategories" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "subcategories_category_id_idx" ON "subcategories" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_store_base_target_idx" UNIQUE("store_id","base_currency","target_currency");