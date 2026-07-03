/* eslint-disable @typescript-eslint/no-explicit-any */
// Verifies productService wraps all product/variant/option DB work in
// withTenant(storeId, fn) (RLS Phase 1). withTenant + productRepo are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({ withTenantMock: vi.fn() }));
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    const sentinelTx = { __sentinel: 'tx' };
    return fn(sentinelTx);
  },
}));

const { productRepo } = vi.hoisted(() => ({
  productRepo: {
    findByStoreId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findById: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1', isPublished: true, variants: [], modifierGroups: [] }),
    create: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1' }),
    update: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1' }),
    delete: vi.fn().mockResolvedValue({ id: 'p1', storeId: 's1' }),
    createVariant: vi.fn().mockResolvedValue({ id: 'v1', storeId: 's1' }),
    updateVariant: vi.fn().mockResolvedValue({ id: 'v1', storeId: 's1' }),
    deleteVariant: vi.fn().mockResolvedValue({ id: 'v1', storeId: 's1' }),
    createVariantOption: vi.fn().mockResolvedValue({ id: 'vo1', storeId: 's1' }),
    updateVariantOption: vi.fn().mockResolvedValue({ id: 'vo1', storeId: 's1' }),
    deleteVariantOption: vi.fn().mockResolvedValue({ id: 'vo1', storeId: 's1' }),
    search: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  },
}));
vi.mock('./product.repo.js', () => ({ productRepo }));

import { productService } from './product.service.js';

describe('productService wraps product work in withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const cases: Array<[string, () => Promise<unknown>, string, unknown[]]> = [
    ['findByStoreId',   () => productService.findByStoreId('s1'), 's1', ['s1', undefined, expect.objectContaining({ __sentinel: 'tx' })]],
    ['findById',        () => productService.findById('p1', 's1'), 's1', ['p1', 's1', expect.objectContaining({ __sentinel: 'tx' })]],
    ['update',          () => productService.update('p1', 's1', { titleEn: 'X' } as any), 's1', ['p1', 's1', { titleEn: 'X' }, expect.objectContaining({ __sentinel: 'tx' })]],
    ['delete',          () => productService.delete('p1', 's1'), 's1', ['p1', 's1', expect.objectContaining({ __sentinel: 'tx' })]],
    ['search',          () => productService.search('s1', { page: 1, limit: 20 }), 's1', ['s1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' })]],
  ];

  it.each(cases)('%s runs inside withTenant(storeId) and threads tx into productRepo', async (_name, call, storeId, expectedRepoArgs) => {
    await call();
    expect(withTenantMock).toHaveBeenCalledWith(storeId);
    // Assert the corresponding repo method received the sentinel tx (last arg).
    // The repo method name matches the service method for these five.
    const repoMethod = (productRepo as any)[_name === 'findByStoreId' ? 'findByStoreId' : _name];
    expect(repoMethod).toHaveBeenCalledWith(...expectedRepoArgs);
  });

  it('create runs inside withTenant(data.storeId) and threads tx into productRepo.create', async () => {
    await productService.create({ storeId: 's1', titleEn: 'X', salePrice: '10.00', categoryId: 'c1' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('createVariant runs inside withTenant(data.storeId) and threads tx', async () => {
    await productService.createVariant({ storeId: 's1', productId: 'p1', nameEn: 'V' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.createVariant).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('createVariantOption runs inside withTenant(data.storeId) and threads tx', async () => {
    await productService.createVariantOption({ storeId: 's1', variantId: 'v1', nameEn: 'O' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.createVariantOption).toHaveBeenCalledWith(expect.objectContaining({ storeId: 's1' }), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('updateVariant runs inside withTenant(storeId) and threads tx', async () => {
    await productService.updateVariant('v1', 's1', { nameEn: 'V' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.updateVariant).toHaveBeenCalledWith('v1', 's1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('deleteVariant runs inside withTenant(storeId) and threads tx', async () => {
    await productService.deleteVariant('v1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.deleteVariant).toHaveBeenCalledWith('v1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('updateVariantOption runs inside withTenant(storeId) and threads tx', async () => {
    await productService.updateVariantOption('vo1', 's1', { nameEn: 'O' } as any);
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.updateVariantOption).toHaveBeenCalledWith('vo1', 's1', expect.any(Object), expect.objectContaining({ __sentinel: 'tx' }));
  });

  it('deleteVariantOption runs inside withTenant(storeId) and threads tx', async () => {
    await productService.deleteVariantOption('vo1', 's1');
    expect(withTenantMock).toHaveBeenCalledWith('s1');
    expect(productRepo.deleteVariantOption).toHaveBeenCalledWith('vo1', 's1', expect.objectContaining({ __sentinel: 'tx' }));
  });
});