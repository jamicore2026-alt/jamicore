<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';

  interface Props {
    categories: { id: string; nameEn: string }[];
    currentCategoryId?: string | null;
    minPrice?: string | null;
    maxPrice?: string | null;
    visibleFilters?: string[];
    onFilter?: (key: string, value: string | null) => void;
  }

  let {
    categories = [],
    currentCategoryId,
    minPrice,
    maxPrice,
    visibleFilters = ['category', 'price'],
    onFilter,
  }: Props = $props();

	// svelte-ignore state_referenced_locally
  let localMinPrice = $state(minPrice ?? '');
	// svelte-ignore state_referenced_locally
  let localMaxPrice = $state(maxPrice ?? '');

  function setCategory(id: string) {
    const next = currentCategoryId === id ? null : id;
    onFilter?.('category', next);
  }

  function applyPrice() {
    onFilter?.('minPrice', localMinPrice || null);
    onFilter?.('maxPrice', localMaxPrice || null);
  }

  function clearAll() {
    localMinPrice = '';
    localMaxPrice = '';
    onFilter?.('category', null);
    onFilter?.('minPrice', null);
    onFilter?.('maxPrice', null);
  }
</script>

<div class="space-y-6">
  {#if visibleFilters.includes('category') && categories.length > 0}
    <div>
      <h3 class="text-sm font-semibold text-[var(--color-text)] mb-3">Category</h3>
      <div class="space-y-1">
        {#each categories as cat}
          <button
            class="block w-full text-left px-3 py-2 text-sm rounded-[var(--radius-md)] transition-colors {currentCategoryId === cat.id
              ? 'bg-[var(--color-primary)] text-white font-medium'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'}"
            onclick={() => setCategory(cat.id)}
          >
            {cat.nameEn}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if visibleFilters.includes('price')}
    <div>
      <h3 class="text-sm font-semibold text-[var(--color-text)] mb-3">Price Range</h3>
      <div class="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          bind:value={localMinPrice}
          class="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          min="0"
          step="0.01"
          onkeydown={(e) => e.key === 'Enter' && applyPrice()}
        />
        <span class="text-[var(--color-text-secondary)] text-sm">-</span>
        <input
          type="number"
          placeholder="Max"
          bind:value={localMaxPrice}
          class="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          min="0"
          step="0.01"
          onkeydown={(e) => e.key === 'Enter' && applyPrice()}
        />
      </div>
      <Button variant="outline" size="sm" class="mt-2 w-full" onclick={applyPrice}>
        Apply
      </Button>
    </div>
  {/if}

  <Button variant="ghost" size="sm" class="w-full text-[var(--color-text-secondary)]" onclick={clearAll}>
    Clear All Filters
  </Button>
</div>