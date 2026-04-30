DROP INDEX "coupons_store_id_code_idx";--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "last_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_invitations" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cookie_consents" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_notifications" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "return_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlists" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variant_combinations_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant_combinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "carts_store_id_idx" ON "carts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "carts_session_id_idx" ON "carts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "carts_customer_id_idx" ON "carts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_store_id_idx" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "orders_coupon_id_idx" ON "orders" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_variant_options_variant_id_idx" ON "product_variant_options" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_store_id_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "returns_store_id_idx" ON "returns" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "shipping_rates_store_id_idx" ON "shipping_rates" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "shipping_rates_zone_id_idx" ON "shipping_rates" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "shipping_zones_store_id_idx" ON "shipping_zones" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "tax_rates_store_id_idx" ON "tax_rates" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "users_store_id_idx" ON "users" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "verification_tokens_email_type_user_type_idx" ON "verification_tokens" USING btree ("email","type","user_type");--> statement-breakpoint
CREATE INDEX "webhooks_store_id_idx" ON "webhooks" USING btree ("store_id");--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_store_id_code_unique" UNIQUE("store_id","code");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_unique" UNIQUE("order_id");