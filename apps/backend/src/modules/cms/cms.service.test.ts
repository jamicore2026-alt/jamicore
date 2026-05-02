import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cmsService } from './cms.service.js';
import { ErrorCodes } from '../../errors/codes.js';

// ─── Mock cmsRepo ───
vi.mock('./cms.repo.js', () => ({
  cmsRepo: {
    findByStoreId: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findPublishedBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
import { cmsRepo as _cmsRepo } from './cms.repo.js';
const mockRepo = _cmsRepo as any;

describe('cmsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPages', () => {
    it('returns paginated pages', async () => {
      mockRepo.findByStoreId.mockResolvedValue({ items: [{ id: 'p1', title: 'About' }], total: 1 });
      const result = await cmsService.listPages('store-1', { limit: 10, offset: 0 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepo.findByStoreId).toHaveBeenCalledWith('store-1', expect.objectContaining({ limit: 10, offset: 0 }));
    });

    it('clamps limit to max 100', async () => {
      mockRepo.findByStoreId.mockResolvedValue({ items: [], total: 0 });
      await cmsService.listPages('store-1', { limit: 200 });
      expect(mockRepo.findByStoreId).toHaveBeenCalledWith('store-1', expect.objectContaining({ limit: 100 }));
    });
  });

  describe('getPage', () => {
    it('returns page when found', async () => {
      const page = { id: 'p1', title: 'About', storeId: 'store-1' };
      mockRepo.findById.mockResolvedValue(page);
      const result = await cmsService.getPage('p1', 'store-1');
      expect(result).toEqual(page);
    });

    it('throws CMS_PAGE_NOT_FOUND when missing', async () => {
      mockRepo.findById.mockResolvedValue(undefined);
      await expect(cmsService.getPage('missing', 'store-1')).rejects.toMatchObject({
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    });
  });

  describe('getPublishedPageBySlug', () => {
    it('returns published page', async () => {
      const page = { id: 'p1', slug: 'about', isPublished: true };
      mockRepo.findPublishedBySlug.mockResolvedValue(page);
      const result = await cmsService.getPublishedPageBySlug('about', 'store-1');
      expect(result).toEqual(page);
    });

    it('throws CMS_PAGE_NOT_FOUND when not published', async () => {
      mockRepo.findPublishedBySlug.mockResolvedValue(undefined);
      await expect(cmsService.getPublishedPageBySlug('about', 'store-1')).rejects.toMatchObject({
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    });
  });

  describe('createPage', () => {
    it('creates page with publishedAt when isPublished=true', async () => {
      mockRepo.findBySlug.mockResolvedValue(undefined);
      mockRepo.create.mockResolvedValue({ id: 'p1', slug: 'about', isPublished: true });
      const result = await cmsService.createPage('store-1', { slug: 'about', title: 'About', content: 'Hello', isPublished: true });
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'about', isPublished: true, publishedAt: expect.any(Date) }),
      );
      expect(result.id).toBe('p1');
    });

    it('throws VALIDATION_ERROR when slug already exists', async () => {
      mockRepo.findBySlug.mockResolvedValue({ id: 'p2', slug: 'about' });
      await expect(cmsService.createPage('store-1', { slug: 'about', title: 'About', content: 'Hello' })).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
      });
    });
  });

  describe('updatePage', () => {
    it('updates page and sets publishedAt when publishing', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'about', isPublished: false });
      mockRepo.findBySlug.mockResolvedValue(undefined);
      mockRepo.update.mockResolvedValue({ id: 'p1', isPublished: true });
      const result = await cmsService.updatePage('p1', 'store-1', { isPublished: true });
      expect(mockRepo.update).toHaveBeenCalledWith('p1', 'store-1', expect.objectContaining({ isPublished: true, publishedAt: expect.any(Date) }));
      expect(result.isPublished).toBe(true);
    });

    it('clears publishedAt when unpublishing', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'about', isPublished: true });
      mockRepo.update.mockResolvedValue({ id: 'p1', isPublished: false });
      const result = await cmsService.updatePage('p1', 'store-1', { isPublished: false });
      expect(mockRepo.update).toHaveBeenCalledWith('p1', 'store-1', expect.objectContaining({ isPublished: false, publishedAt: null }));
      expect(result.isPublished).toBe(false);
    });

    it('throws VALIDATION_ERROR when changing slug to existing one', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'p1', slug: 'about' });
      mockRepo.findBySlug.mockResolvedValue({ id: 'p2', slug: 'new-slug' });
      await expect(cmsService.updatePage('p1', 'store-1', { slug: 'new-slug' })).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
      });
    });
  });

  describe('deletePage', () => {
    it('deletes page when found', async () => {
      mockRepo.delete.mockResolvedValue({ id: 'p1' });
      const result = await cmsService.deletePage('p1', 'store-1');
      expect(result.id).toBe('p1');
    });

    it('throws CMS_PAGE_NOT_FOUND when missing', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      await expect(cmsService.deletePage('missing', 'store-1')).rejects.toMatchObject({
        code: ErrorCodes.CMS_PAGE_NOT_FOUND,
      });
    });
  });
});
