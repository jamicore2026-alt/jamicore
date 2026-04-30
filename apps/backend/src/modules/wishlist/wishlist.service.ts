// Wishlist service — business logic, calls wishlistRepo, never imports db directly
import { wishlistRepo } from './wishlist.repo.js';

export const wishlistService = {
  async getWishlist(customerId: string, storeId: string) {
    const items = await wishlistRepo.findByCustomerId(customerId, storeId);
    return { wishlist: items };
  },

  async addItem(customerId: string, storeId: string, productId: string) {
    // Check if already in wishlist
    const existing = await wishlistRepo.findExistingItem(customerId, productId);

    if (existing) {
      return { duplicate: true as const };
    }

    const item = await wishlistRepo.insertItem({
      customerId,
      storeId,
      productId,
    });

    return { wishlistItem: item };
  },

  async removeItem(customerId: string, productId: string) {
    await wishlistRepo.deleteItem(customerId, productId);
  },
};