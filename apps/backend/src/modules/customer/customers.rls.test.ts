// apps/backend/src/modules/customer/customers.rls.test.ts
// Real-DB RLS negative test for customers + customer_addresses (RLS Phase 1).
// Connects as app_tenant (RLS-enforced) via a dedicated (max: 1) connection so
// session-level set_config is safe. Proves the database enforces isolation
// independently of the application layer (the withTenant refactor in Tasks 1-6
// sets app.tenant_id; this test verifies RLS actually uses it).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { dbOwner } from '../../db/index.js';

function tenantUrl(): string {
  const owner = process.env.DATABASE_URL!;
  const pw = process.env.RLS_TENANT_PASSWORD!;
  const u = new URL(owner);
  u.username = 'app_tenant';
  u.password = pw;
  return u.toString();
}

const tenantClient = postgres(tenantUrl(), { max: 1, onnotice: () => {} });
const tenantDb = drizzle(tenantClient, { schema });

let storeAId: string;
let storeBId: string;
let customerAId: string;
let customerBId: string;
let addressAId: string;
let addressBId: string;

// Distinct domains so this test's residue is identifiable and cleanable.
const DOMAIN_A = 'rls-cust-a.test';
const DOMAIN_B = 'rls-cust-b.test';

beforeAll(async () => {
  // ─── Self-cleaning pre-pass (FK-respecting: addresses → customers → stores) ───
  // Delete any residue from a prior crashed run BEFORE inserting, so the test
  // is re-runnable even if a previous beforeAll died mid-seed. Owned by dbOwner
  // (BYPASSRLS). Order respects FKs (customer_addresses → customers → stores).
  for (const domain of [DOMAIN_A, DOMAIN_B]) {
    const stores = await dbOwner
      .select({ id: schema.stores.id })
      .from(schema.stores)
      .where(eq(schema.stores.domain, domain));
    for (const s of stores) {
      await dbOwner
        .delete(schema.customerAddresses)
        .where(eq(schema.customerAddresses.storeId, s.id));
      await dbOwner
        .delete(schema.customers)
        .where(eq(schema.customers.storeId, s.id));
    }
    await dbOwner.delete(schema.stores).where(eq(schema.stores.domain, domain));
  }

  // ─── Seed as the OWNER (bypasses RLS) ────────────────────────────────────
  const [storeA] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cust-A',
    domain: DOMAIN_A,
    ownerEmail: 'a@rls-cust-a.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  const [storeB] = await dbOwner.insert(schema.stores).values({
    name: 'rls-cust-B',
    domain: DOMAIN_B,
    ownerEmail: 'b@rls-cust-b.test',
    storeType: 'food',
    currency: 'USD',
    language: 'en',
  }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;

  // One customer per store (required notNull: storeId, email, password,
  // firstName, lastName; mfaEnabled notNull has default).
  const [custA] = await dbOwner.insert(schema.customers).values({
    storeId: storeAId,
    email: `a-${Date.now()}@rls-cust-a.test`,
    password: 'hash',
    firstName: 'A',
    lastName: 'One',
    isVerified: true,
  }).returning();
  const [custB] = await dbOwner.insert(schema.customers).values({
    storeId: storeBId,
    email: `b-${Date.now()}@rls-cust-b.test`,
    password: 'hash',
    firstName: 'B',
    lastName: 'Two',
    isVerified: true,
  }).returning();
  customerAId = custA.id;
  customerBId = custB.id;

  // One address per customer (required notNull: customerId, storeId, name,
  // firstName, lastName, addressLine1, city, country, postalCode).
  const [addrA] = await dbOwner.insert(schema.customerAddresses).values({
    customerId: customerAId,
    storeId: storeAId,
    name: 'Home',
    firstName: 'A',
    lastName: 'One',
    addressLine1: '1 A St',
    city: 'Riyadh',
    country: 'SA',
    postalCode: '11111',
    isDefault: true,
  }).returning();
  const [addrB] = await dbOwner.insert(schema.customerAddresses).values({
    customerId: customerBId,
    storeId: storeBId,
    name: 'Home',
    firstName: 'B',
    lastName: 'Two',
    addressLine1: '2 B St',
    city: 'Jeddah',
    country: 'SA',
    postalCode: '22222',
    isDefault: true,
  }).returning();
  addressAId = addrA.id;
  addressBId = addrB.id;
});

afterAll(async () => {
  // Clean up as the owner (RLS-bypass). Order respects FKs.
  await dbOwner
    .delete(schema.customerAddresses)
    .where(eq(schema.customerAddresses.id, addressAId));
  await dbOwner
    .delete(schema.customerAddresses)
    .where(eq(schema.customerAddresses.id, addressBId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerAId));
  await dbOwner.delete(schema.customers).where(eq(schema.customers.id, customerBId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeAId));
  await dbOwner.delete(schema.stores).where(eq(schema.stores.id, storeBId));
  await tenantClient.end();
});

// Set app.tenant_id session-level on the dedicated connection. The `null` case
// uses RESET (truly unset) — this mimics the real fail-closed scenario: a code
// path that forgets withTenant leaves the GUC unset, so current_setting(...,true)
// returns NULL → store_id = NULL → zero rows.
async function setTenant(storeId: string | null) {
  if (storeId === null) {
    await tenantClient.unsafe('RESET app.tenant_id');
    return;
  }
  await tenantClient.unsafe(
    `SELECT set_config('app.tenant_id', '${storeId}', false)`,
  );
}

describe('customers + customer_addresses RLS (app_tenant role)', () => {
  it('returns zero rows when no tenant context is set (fail-closed)', async () => {
    await setTenant(null);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.length).toBe(0);
    expect(addresses.length).toBe(0);
  });

  it('shows only store A rows when app.tenant_id = storeA (single-tenant)', async () => {
    await setTenant(storeAId);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.length).toBe(1);
    expect(customers[0].storeId).toBe(storeAId);
    expect(customers[0].id).toBe(customerAId);
    expect(addresses.length).toBe(1);
    expect(addresses[0].storeId).toBe(storeAId);
    expect(addresses[0].id).toBe(addressAId);
  });

  it('does NOT show store B rows when app.tenant_id = storeA (cross-tenant isolation)', async () => {
    await setTenant(storeAId);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.every((r) => r.storeId === storeAId)).toBe(true);
    expect(customers.find((r) => r.storeId === storeBId)).toBeUndefined();
    expect(addresses.every((r) => r.storeId === storeAId)).toBe(true);
    expect(addresses.find((r) => r.storeId === storeBId)).toBeUndefined();
  });

  it('shows store B rows when app.tenant_id = storeB', async () => {
    await setTenant(storeBId);
    const customers = await tenantDb.query.customers.findMany();
    const addresses = await tenantDb.query.customerAddresses.findMany();
    expect(customers.length).toBe(1);
    expect(customers[0].storeId).toBe(storeBId);
    expect(addresses.length).toBe(1);
    expect(addresses[0].storeId).toBe(storeBId);
  });

  it('rejects inserts whose storeId does not match app.tenant_id (WITH CHECK)', async () => {
    await setTenant(storeAId);
    // customers: wrong storeId → reject
    await expect(
      tenantDb.insert(schema.customers).values({
        storeId: storeBId,
        email: `reject-${Date.now()}@rls.test`,
        password: 'h',
        firstName: 'R',
        lastName: 'J',
      }),
    ).rejects.toThrow();
    // customer_addresses: wrong storeId (customerId belongs to store A) → reject
    await expect(
      tenantDb.insert(schema.customerAddresses).values({
        customerId: customerAId,
        storeId: storeBId,
        name: 'Home',
        firstName: 'R',
        lastName: 'J',
        addressLine1: '9 R St',
        city: 'X',
        country: 'SA',
        postalCode: '99999',
      }),
    ).rejects.toThrow();
  });

  it('accepts inserts whose storeId matches app.tenant_id (WITH CHECK accept)', async () => {
    await setTenant(storeAId);
    // customers: matching storeId → accept
    const [cust] = await tenantDb.insert(schema.customers).values({
      storeId: storeAId,
      email: `ok-${Date.now()}-${Math.random().toString(36).slice(2)}@rls.test`,
      password: 'h',
      firstName: 'O',
      lastName: 'K',
    }).returning();
    expect(cust.storeId).toBe(storeAId);
    // customer_addresses: matching storeId + the new customer's id → accept
    const [addr] = await tenantDb.insert(schema.customerAddresses).values({
      customerId: cust.id,
      storeId: storeAId,
      name: 'Home',
      firstName: 'O',
      lastName: 'K',
      addressLine1: '1 O St',
      city: 'X',
      country: 'SA',
      postalCode: '11111',
    }).returning();
    expect(addr.storeId).toBe(storeAId);
    // cleanup (as the tenant — allowed since storeId matches)
    await tenantDb.delete(schema.customerAddresses).where(eq(schema.customerAddresses.id, addr.id));
    await tenantDb.delete(schema.customers).where(eq(schema.customers.id, cust.id));
  });
});