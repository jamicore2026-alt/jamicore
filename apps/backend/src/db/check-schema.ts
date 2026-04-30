import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  // Check products table
  const productCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'inventory_alert_threshold'`;
  console.log('products.inventory_alert_threshold:', productCols.length > 0 ? 'EXISTS' : 'MISSING');
  
  // Check customers table
  const customerCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tags'`;
  console.log('customers.tags:', customerCols.length > 0 ? 'EXISTS' : 'MISSING');
  
  // Check exchange_rates table
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'exchange_rates'`;
  console.log('exchange_rates table:', tables.length > 0 ? 'EXISTS' : 'MISSING');
  
  // Check returns table
  const returnsTable = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'returns'`;
  console.log('returns table:', returnsTable.length > 0 ? 'EXISTS' : 'MISSING');
  
  // Check webhooks table
  const webhooksTable = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'webhooks'`;
  console.log('webhooks table:', webhooksTable.length > 0 ? 'EXISTS' : 'MISSING');
  
  await sql.end();
}

main().catch(console.error);
