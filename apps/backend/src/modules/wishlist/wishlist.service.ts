// Wishlist service — business logic, calls wishlistRepo, never imports db directly.
// Every method receives the RLS transaction from the route's withTenant() and
// forwards it to the repo so queries run scoped to app.tenant_id.
import type { DbOrTx } from '../_shared/db-types.js';
import { wishlistRepo } from './wishlist.repo.js';

export const wishlistService = {
  async getWishlist(customerId: string, storeId: string, tx?: DbOrTx) {
    const items = await wishlistRepo.findByCustomerId(customerId, storeId, tx);
    return { wishlist: items };
  },

  async addItem(customerId: string, storeId: string, productId: string, tx?: DbOrTx) {
    // Check if already in wishlist
    const existing = await wishlistRepo.findExistingItem(customerId, productId, tx);

    if (existing) {
      return { duplicate: true as const };
    }

    const item = await wishlistRepo.insertItem(
      {
        customerId,
        storeId,
        productId,
      },
      tx,
    );

    return { wishlistItem: item };
  },

  async removeItem(customerId: string, productId: string, tx?: DbOrTx) {
    await wishlistRepo.deleteItem(customerId, productId, tx);
  },
};