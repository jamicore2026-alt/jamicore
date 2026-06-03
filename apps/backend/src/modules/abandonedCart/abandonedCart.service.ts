// Abandoned Cart service — business logic for identifying and listing abandoned carts
import { abandonedCartRepo } from './abandonedCart.repo.js';

export const abandonedCartService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number; hoursSinceUpdate?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const { items, total } = await abandonedCartRepo.findMany(storeId, {
      limit,
      offset,
      hoursSinceUpdate: opts?.hoursSinceUpdate,
    });

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async count(storeId: string, hoursSinceUpdate?: number) {
    return abandonedCartRepo.countByStoreId(storeId, hoursSinceUpdate);
  },
};
