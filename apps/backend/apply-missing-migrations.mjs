/* global console */
import postgres from 'postgres';

const sql = postgres('postgresql://saas_ecom:saas_ecom_dev_pass@localhost:5432/saas_ecom_dev');

async function main() {
  // Check state
  const tables = ['product_bundles', 'product_bundle_items'];
  for (const t of tables) {
    const res = await sql`SELECT to_regclass('public.' || ${t}) as exists`;
    console.log(`${t}: ${res[0].exists ? 'EXISTS' : 'MISSING'}`);
  }

  const colRes = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'bundle_id'`;
  console.log(`cart_items.bundle_id: ${colRes.length ? 'EXISTS' : 'MISSING'}`);

  const mpRes = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'merchant_plans' AND column_name = 'max_staff'`;
  console.log(`merchant_plans.max_staff: ${mpRes.length ? 'EXISTS' : 'MISSING'}`);

  try {
    await sql.begin(async tx => {
      // 0009
      await tx`CREATE TABLE IF NOT EXISTS "product_bundle_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "bundle_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" integer DEFAULT 1 NOT NULL,
        "sort_order" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL
      )`;
      await tx`CREATE TABLE IF NOT EXISTS "product_bundles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "store_id" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "price" numeric(10, 2) NOT NULL,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )`;

      // FKs with do-block to ignore duplicates
      await tx`
        DO $$ BEGIN
          ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_bundle_id_product_bundles_id_fk"
            FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;
      await tx`
        DO $$ BEGIN
          ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_product_id_products_id_fk"
            FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;
      await tx`
        DO $$ BEGIN
          ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_store_id_stores_id_fk"
            FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;

      // 0010: cart_items
      const priceRes = await tx`SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'price'`;
      if (priceRes.length && (priceRes[0].numeric_precision !== '10' || priceRes[0].numeric_scale !== '2')) {
        await tx`ALTER TABLE "cart_items" ALTER COLUMN "price" SET DATA TYPE numeric(10, 2)`;
        console.log('Altered cart_items.price to numeric(10,2)');
      }
      const totalRes = await tx`SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'total'`;
      if (totalRes.length && (totalRes[0].numeric_precision !== '10' || totalRes[0].numeric_scale !== '2')) {
        await tx`ALTER TABLE "cart_items" ALTER COLUMN "total" SET DATA TYPE numeric(10, 2)`;
        console.log('Altered cart_items.total to numeric(10,2)');
      }
      if (colRes.length === 0) {
        await tx`ALTER TABLE "cart_items" ADD COLUMN "bundle_id" uuid`;
        console.log('Added cart_items.bundle_id');
      }
      await tx`
        DO $$ BEGIN
          ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bundle_id_product_bundles_id_fk"
            FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE set null ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;

      // 0011: max_staff
      if (mpRes.length === 0) {
        await tx`ALTER TABLE "merchant_plans" ADD COLUMN IF NOT EXISTS "max_staff" integer DEFAULT 3`;
        console.log('Added merchant_plans.max_staff');
      }

      // Mark all missing migrations in __drizzle_migrations
      const migRes = await tx`SELECT hash FROM "__drizzle_migrations"`;
      const existingHashes = new Set(migRes.map(r => r.hash));
      const migrations = [
        '0004_demonic_karen_page',
        '0005_fresh_killer_shrike',
        '0006_needy_daimon_hellstrom',
        '0007_fine_green_goblin',
        '0008_mean_thaddeus_ross',
        '0009_unknown_zzzax',
        '0010_right_orphan',
        '0011_add_max_staff',
      ];
      for (const hash of migrations) {
        if (!existingHashes.has(hash)) {
          await tx`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (${hash}, NOW())`;
          console.log(`Marked migration ${hash} as applied`);
        }
      }
    });
    console.log('Schema changes applied successfully');
  } catch (err) {
    console.error('Error:', err.message);
  }

  await sql.end();
}

main();
