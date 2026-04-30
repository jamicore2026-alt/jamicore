ALTER TABLE "merchant_plans" ADD COLUMN IF NOT EXISTS "max_staff" integer DEFAULT 3;

UPDATE "merchant_plans" SET "max_staff" = 3 WHERE "max_staff" IS NULL;
