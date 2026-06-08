CREATE TABLE "domain_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"verification_type" text DEFAULT 'cname' NOT NULL,
	"cname_target" text,
	"txt_name" text,
	"txt_value" text,
	"status" text DEFAULT 'pending_dns' NOT NULL,
	"ssl_status" text,
	"verified_at" timestamp,
	"last_checked_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" text DEFAULT 'online';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cashier_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pos_payment_method" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount_tendered" numeric;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "change_given" numeric;--> statement-breakpoint
ALTER TABLE "domain_verifications" ADD CONSTRAINT "domain_verifications_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_domain_verifications_store" ON "domain_verifications" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_domain_verifications_status" ON "domain_verifications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_domain_verifications_domain" ON "domain_verifications" USING btree ("domain");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;