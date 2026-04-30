<script lang="ts">
  import type { PageData } from './$types.js';
  import ProductGrid from '$lib/components/product/ProductGrid.svelte';
  import ProductFilters from '$lib/components/product/ProductFilters.svelte';
  import ProductSort from '$lib/components/product/ProductSort.svelte';
  import ProductPagination from '$lib/components/product/ProductPagination.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { SlidersHorizontal } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  let mobileFiltersOpen = $state(false);

  const themeType = $derived(data.themeType ?? 'appliances');

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    goto('?' + params.toString(), { keepFocus: true, noScroll: true });
  }
</script>

<svelte:head>
  <title>Products | {data.store?.name ?? 'Store'}</title>
  <meta name="description" content="Browse our collection of products" />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-[var(--color-text)]">
      {#if data.filters.q}
        Search: "{data.filters.q}"
      {:else}
        Products
      {/if}
    </h1>
    <div class="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        class="lg:hidden"
        onclick={() => (mobileFiltersOpen = !mobileFiltersOpen)}
      >
        <SlidersHorizontal class="size-4 mr-2" />
        Filters
      </Button>
      <ProductSort current={data.filters.sort} />
    </div>
  </div>

  <div class="flex gap-8">
    <!-- Desktop filters sidebar -->
    {#if data.storeConfig.filtersEnabled}
      <aside class="hidden lg:block w-64 shrink-0">
        <ProductFilters
          categories={data.categories}
          currentCategoryId={data.filters.categoryId}
          minPrice={data.filters.minPrice}
          maxPrice={data.filters.maxPrice}
          visibleFilters={data.storeConfig.visibleFilters}
          onFilter={updateFilter}
        />
      </aside>
    {/if}

    <!-- Product grid -->
    <div class="flex-1 min-w-0">
      {#if data.products.length === 0}
        <div class="text-center py-16">
          <p class="text-lg text-[var(--color-text-secondary)]">No products found</p>
          {#if data.filters.q}
            <p class="text-sm text-[var(--color-text-secondary)] mt-2">
              Try adjusting your search or filters
            </p>
          {/if}
        </div>
      {:else}
        <ProductGrid
          products={data.products}
          {themeType}
          columns={data.storeConfig.defaultColumns}
          showAddToCart={data.storeConfig.showAddToCartOnCard}
          showDiscountBadge={data.storeConfig.showDiscountBadge}
        />

        <ProductPagination
          page={data.page}
          total={data.total}
          limit={data.limit}
        />
      {/if}
    </div>
  </div>
</div>

<!-- Mobile filter drawer -->
{#if mobileFiltersOpen}
  <div class="fixed inset-0 z-50 lg:hidden">
    <button
      type="button"
      class="absolute inset-0 bg-black/50 cursor-default"
      aria-label="Close filters"
      onclick={() => (mobileFiltersOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (mobileFiltersOpen = false)}
    ></button>
    <div class="absolute left-0 top-0 bottom-0 w-80 bg-[var(--color-bg)] p-6 overflow-y-auto shadow-xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold">Filters</h2>
        <Button variant="ghost" size="sm" onclick={() => (mobileFiltersOpen = false)}>Close</Button>
      </div>
      <ProductFilters
        categories={data.categories}
        currentCategoryId={data.filters.categoryId}
        minPrice={data.filters.minPrice}
        maxPrice={data.filters.maxPrice}
        visibleFilters={data.storeConfig.visibleFilters}
        onFilter={updateFilter}
      />
    </div>
  </div>
{/if}