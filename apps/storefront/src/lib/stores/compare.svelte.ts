import type { ProductListItem } from '@repo/shared-types';

const STORAGE_KEY = 'compare_products';
const MAX_ITEMS = 4;

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

export function createCompareStore() {
  let items = $state<ProductListItem[]>(getStored());

  function add(product: ProductListItem) {
    if (items.length >= MAX_ITEMS) return false;
    if (items.some((i) => i.id === product.id)) return false;
    items = [...items, product];
    save(items);
    return true;
  }

  function remove(productId: string) {
    items = items.filter((i) => i.id !== productId);
    save(items);
  }

  function toggle(product: ProductListItem) {
    if (items.some((i) => i.id === product.id)) {
      remove(product.id);
      return false;
    }
    return add(product);
  }

  function isSelected(productId: string) {
    return items.some((i) => i.id === productId);
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
    toggle,
    isSelected,
    clear,
  };
}

export const compareStore = createCompareStore();
