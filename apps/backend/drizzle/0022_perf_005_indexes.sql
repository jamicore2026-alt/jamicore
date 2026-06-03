-- PERF-005: Add B-tree indexes for tables that were missing them.
-- Each index corresponds to a common query path documented in db/schema.ts.

-- product_bundle_items: bundleId (join), storeId (tenant scope), productId
CREATE INDEX IF NOT EXISTS "product_bundle_items_bundle_id_idx" ON "product_bundle_items" ("bundle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_bundle_items_store_id_idx" ON "product_bundle_items" ("store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_bundle_items_product_id_idx" ON "product_bundle_items" ("product_id");
--> statement-breakpoint

-- role_permissions: storeId+role is the lookup/upsert key
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_store_id_role_uq" UNIQUE ("store_id","role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_permissions_store_id_idx" ON "role_permissions" ("store_id");
--> statement-breakpoint

-- webhook_deliveries: webhookId (join), status (filter), createdAt (order)
CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries" ("webhook_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_deliveries_status_idx" ON "webhook_deliveries" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_deliveries_created_at_idx" ON "webhook_deliveries" ("created_at");
--> statement-breakpoint

-- merchant_notifications: composite (storeId, createdAt) and (storeId, isRead)
CREATE INDEX IF NOT EXISTS "merchant_notifications_store_id_created_at_idx" ON "merchant_notifications" ("store_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchant_notifications_store_id_is_read_idx" ON "merchant_notifications" ("store_id","is_read");
--> statement-breakpoint

-- support_tickets: composite (storeId, createdAt) and (status), plus (assignedTo)
CREATE INDEX IF NOT EXISTS "support_tickets_store_id_created_at_idx" ON "support_tickets" ("store_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_assigned_to_idx" ON "support_tickets" ("assigned_to");
--> statement-breakpoint

-- ticket_replies: composite (ticketId, createdAt)
CREATE INDEX IF NOT EXISTS "ticket_replies_ticket_id_created_at_idx" ON "ticket_replies" ("ticket_id","created_at");
