// Review service — business logic, calls repo, throws domain errors
import { reviewRepo } from './review.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

export const reviewService = {
  async findByProductId(productId: string, storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await withTenant(storeId, (tx) =>
      Promise.all([
        reviewRepo.findManyByProductId(productId, storeId, { limit, offset }, tx),
        reviewRepo.countByProductId(productId, storeId, tx),
      ]),
    );

    const total = totalResult[0]?.count ?? 0;

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

  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await withTenant(storeId, (tx) =>
      Promise.all([
        reviewRepo.findManyByStoreId(storeId, { limit, offset }, tx),
        reviewRepo.countByStoreId(storeId, tx),
      ]),
    );

    const total = totalResult[0]?.count ?? 0;

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

  async findById(reviewId: string, storeId: string) {
    const review = await withTenant(storeId, (tx) => reviewRepo.findById(reviewId, storeId, tx));

    if (!review) {
      throw Object.assign(new Error('Review not found'), {
        code: ErrorCodes.REVIEW_NOT_FOUND,
      });
    }

    return review;
  },

  async create(data: {
    storeId: string;
    productId: string;
    customerId?: string;
    orderId?: string;
    rating: number;
    title?: string;
    content: string;
    images?: string[];
    isVerified?: boolean;
  }) {
    const [review] = await withTenant(data.storeId, (tx) =>
      reviewRepo.create(
        {
          storeId: data.storeId,
          productId: data.productId,
          customerId: data.customerId,
          orderId: data.orderId,
          rating: data.rating,
          title: data.title,
          content: data.content,
          images: data.images,
          isVerified: data.isVerified ?? false,
        },
        tx,
      ),
    );

    return review;
  },

  async update(reviewId: string, storeId: string, data: Partial<{
    rating: number;
    title: string;
    content: string;
    images: string[];
    isApproved: boolean;
    response: string;
  }>) {
    return withTenant(storeId, async (tx) => {
      const review = await reviewRepo.findByIdBasic(reviewId, storeId, tx);

      if (!review) {
        throw Object.assign(new Error('Review not found'), {
          code: ErrorCodes.REVIEW_NOT_FOUND,
        });
      }

      const updateData: Partial<Parameters<typeof reviewRepo.update>[2]> = {
        ...data,
      };

      // If responding to a review, set respondedAt timestamp
      if (data.response) {
        updateData.respondedAt = new Date();
      }

      const [updated] = await reviewRepo.update(reviewId, storeId, updateData, tx);

      return updated;
    });
  },

  async delete(reviewId: string, storeId: string) {
    return withTenant(storeId, async (tx) => {
      const review = await reviewRepo.findByIdBasic(reviewId, storeId, tx);

      if (!review) {
        throw Object.assign(new Error('Review not found'), {
          code: ErrorCodes.REVIEW_NOT_FOUND,
        });
      }

      await reviewRepo.deleteById(reviewId, storeId, tx);

      return { id: reviewId, deleted: true };
    });
  },
};