import type { ProductListItem } from '@repo/shared-types';

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 8;

function getStored(): ProductListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProductListItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: ProductListItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function createRecentlyViewedStore() {
  let items = $state<ProductListItem[]>(getStored());

  function add(product: ProductListItem) {
    items = [product, ...items.filter((i) => i.id !== product.id)].slice(0, MAX_ITEMS);
    save(items);
  }

  function remove(productId: string) {
    items = items.filter((i) => i.id !== productId);
    save(items);
  }

  function clear() {
    items = [];
    save([]);
  }

  return {
    get items() {
      return items;
    },
    add,
    remove,
    clear,
  };
}

export const recentlyViewed = createRecentlyViewedStore();
