CREATE TABLE "coupon_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL,
	"store_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "tags" SET DATA TYPE json USING tags::json;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "tags" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "images" SET DATA TYPE json USING images::json;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "images" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "images" SET DATA TYPE json USING images::json;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "images" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "staff_invitations" ALTER COLUMN "invited_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupon_usages_coupon_customer_idx" ON "coupon_usages" USING btree ("coupon_id","customer_id");--> statement-breakpoint
CREATE INDEX "coupon_usages_store_id_idx" ON "coupon_usages" USING btree ("store_id");--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupons_store_id_code_idx" ON "coupons" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "customers_store_id_email_idx" ON "customers" USING btree ("store_id","email");--> statement-breakpoint
CREATE INDEX "orders_store_id_status_created_at_idx" ON "orders" USING btree ("store_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_store_id_customer_id_idx" ON "orders" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "payments_store_id_provider_provider_payment_id_idx" ON "payments" USING btree ("store_id","provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_store_id_order_id_idx" ON "payments" USING btree ("store_id","order_id");--> statement-breakpoint
CREATE INDEX "products_store_id_is_published_idx" ON "products" USING btree ("store_id","is_published");--> statement-breakpoint
CREATE INDEX "reviews_store_id_product_id_is_approved_idx" ON "reviews" USING btree ("store_id","product_id","is_approved");