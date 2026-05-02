CREATE INDEX "activity_logs_store_id_created_at_idx" ON "activity_logs" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "categories_store_id_idx" ON "categories" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "email_templates_store_id_idx" ON "email_templates" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "modifier_groups_product_id_idx" ON "modifier_groups" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "modifier_groups_category_id_idx" ON "modifier_groups" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "modifier_options_modifier_group_id_idx" ON "modifier_options" USING btree ("modifier_group_id");--> statement-breakpoint
CREATE INDEX "order_items_store_id_idx" ON "order_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_bundles_store_id_idx" ON "product_bundles" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_analytics_store_id_date_idx" ON "store_analytics" USING btree ("store_id","date");--> statement-breakpoint
CREATE INDEX "wishlists_store_id_idx" ON "wishlists" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "wishlists_customer_id_idx" ON "wishlists" USING btree ("customer_id");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "products_title_en_trgm_idx" ON "products" USING gin ("title_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_title_ar_trgm_idx" ON "products" USING gin ("title_ar" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_description_en_trgm_idx" ON "products" USING gin ("description_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_description_ar_trgm_idx" ON "products" USING gin ("description_ar" gin_trgm_ops);