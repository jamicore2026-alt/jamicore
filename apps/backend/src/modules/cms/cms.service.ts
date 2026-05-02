// CMS Page service — business logic, calls cmsRepo, never imports db directly
import { cmsRepo } from './cms.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const cmsService = {
  async listPages(storeId: string, options?: { limit?: number; offset?: number; search?: string; isPublished?: boolean }) {
    const limit = Math.max(1, Math.min(options?.limit ?? 50, 100));
    const offset = Math.max(0, options?.offset ?? 0);
    return cmsRepo.findByStoreId(storeId, { ...options, limit, offset });
  },

  async getPage(id: string, storeId: string) {
    const page = await cmsRepo.findById(id, storeId);
    if (!page) {
      throw Object.assign(new Error('CMS page not found'), {
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    }
    return page;
  },

  async getPageBySlug(slug: string, storeId: string) {
    const page = await cmsRepo.findBySlug(slug, storeId);
    if (!page) {
      throw Object.assign(new Error('CMS page not found'), {
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    }
    return page;
  },

  async getPublishedPageBySlug(slug: string, storeId: string) {
    const page = await cmsRepo.findPublishedBySlug(slug, storeId);
    if (!page) {
      throw Object.assign(new Error('CMS page not found'), {
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    }
    return page;
  },

  async createPage(storeId: string, data: { slug: string; title: string; content: string; metaTitle?: string; metaDescription?: string; isPublished?: boolean }) {
    const existing = await cmsRepo.findBySlug(data.slug, storeId);
    if (existing) {
      throw Object.assign(new Error('A page with this slug already exists'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    const page = await cmsRepo.create({
      storeId,
      ...data,
      publishedAt: data.isPublished ? new Date() : null,
    });

    if (!page) {
      throw Object.assign(new Error('Failed to create CMS page'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return page;
  },

  async updatePage(id: string, storeId: string, data: Partial<{ slug: string; title: string; content: string; metaTitle?: string; metaDescription?: string; isPublished?: boolean }>) {
    const page = await cmsRepo.findById(id, storeId);
    if (!page) {
      throw Object.assign(new Error('CMS page not found'), {
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    }

    if (data.slug && data.slug !== page.slug) {
      const existing = await cmsRepo.findBySlug(data.slug, storeId);
      if (existing) {
        throw Object.assign(new Error('A page with this slug already exists'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }
    }

    const updateData: Parameters<typeof cmsRepo.update>[2] = { ...data };
    if (data.isPublished !== undefined && data.isPublished && !page.isPublished) {
      updateData.publishedAt = new Date();
    }
    if (data.isPublished !== undefined && !data.isPublished) {
      updateData.publishedAt = null;
    }

    const updated = await cmsRepo.update(id, storeId, updateData);
    if (!updated) {
      throw Object.assign(new Error('Failed to update CMS page'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return updated;
  },

  async deletePage(id: string, storeId: string) {
    const page = await cmsRepo.delete(id, storeId);
    if (!page) {
      throw Object.assign(new Error('CMS page not found'), {
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    }
    return page;
  },
};
