// Customer service — business logic, calls customerRepo, never imports db directly
import { customerRepo } from './customer.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const customerService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const { rows, total } = await customerRepo.findByStoreId(storeId, { limit, offset });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(customerId: string, storeId: string) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    return customer;
  },

  async create(data: {
    storeId: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    addresses?: Array<{
      name: string;
      firstName: string;
      lastName: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state?: string;
      country: string;
      postalCode: string;
      phone?: string;
      isDefault?: boolean;
    }>;
  }) {
    // Check if customer already exists in this store
    const existing = await customerRepo.findByEmail(data.email, data.storeId);

    if (existing) {
      throw Object.assign(new Error('Customer already exists'), {
        code: ErrorCodes.CUSTOMER_ALREADY_EXISTS,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const result = await customerRepo.withTransaction(async (tx) => {
      const customer = await customerRepo.insertCustomer({
        storeId: data.storeId,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        phone: data.phone,
      }, tx);

      // Insert addresses if provided
      if (data.addresses && data.addresses.length > 0) {
        await customerRepo.insertAddresses(
          data.addresses.map((addr) => ({
            customerId: customer.id,
            storeId: data.storeId,
            name: addr.name,
            firstName: addr.firstName,
            lastName: addr.lastName,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            city: addr.city,
            state: addr.state,
            country: addr.country,
            postalCode: addr.postalCode,
            phone: addr.phone,
            isDefault: addr.isDefault ?? false,
          })),
          tx,
        );
      }

      return customer;
    });

    // Strip password from response
    const { password: _, ...created } = result;
    return created;
  },

  async update(customerId: string, storeId: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
    marketingEmails: boolean;
  }>) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const updated = await customerRepo.updateCustomer(customerId, storeId, data);

    // Strip password from response
    if (updated) {
      const { password: _, ...result } = updated;
      return result;
    }
    return updated;
  },

  async findByEmail(email: string, storeId: string) {
    // Return the full customer including password for auth verification
    return customerRepo.findByEmail(email, storeId);
  },

  async gdprExport(customerId: string, storeId: string) {
    const customer = await customerRepo.findFullProfileForExport(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    return customer;
  },

  async deleteProfile(customerId: string, storeId: string) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const anonymized = await customerRepo.anonymizeCustomer(customerId, storeId);

    // Strip password from response
    if (anonymized) {
      const { password: _, ...result } = anonymized;
      return result;
    }

    return anonymized;
  },
};