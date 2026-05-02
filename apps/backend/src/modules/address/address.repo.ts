// Address repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { customerAddresses } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

type DbExecutor = typeof db;

type AddressSelect = typeof customerAddresses.$inferSelect;

export const addressRepo = {
  async listAddresses(customerId: string, storeId: string, tx?: DbExecutor): Promise<AddressSelect[]> {
    const executor = tx ?? db;
    return executor.query.customerAddresses.findMany({
      where: and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.storeId, storeId)),
    });
  },

  async clearDefaults(customerId: string, storeId: string, tx?: DbExecutor): Promise<void> {
    const executor = tx ?? db;
    await executor.update(customerAddresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.storeId, storeId)));
  },

  async insertAddress(data: typeof customerAddresses.$inferInsert, tx?: DbExecutor): Promise<AddressSelect> {
    const executor = tx ?? db;
    const [address] = await executor.insert(customerAddresses).values(data).returning();
    return address;
  },

  async findById(addressId: string, customerId: string, storeId: string, tx?: DbExecutor): Promise<AddressSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.customerAddresses.findFirst({
      where: and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ),
    });
  },

  async updateAddress(
    addressId: string,
    customerId: string,
    storeId: string,
    data: Partial<typeof customerAddresses.$inferInsert>,
    tx?: DbExecutor,
  ): Promise<AddressSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor.update(customerAddresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ))
      .returning();
    return updated;
  },

  async deleteAddress(addressId: string, customerId: string, storeId: string, tx?: DbExecutor): Promise<AddressSelect[]> {
    const executor = tx ?? db;
    return executor.delete(customerAddresses)
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ))
      .returning();
  },

  async setDefault(addressId: string, customerId: string, storeId: string, tx?: DbExecutor): Promise<AddressSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor.update(customerAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ))
      .returning();
    return updated;
  },
};