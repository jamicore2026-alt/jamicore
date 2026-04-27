<script lang="ts">
  import type { PageData } from './$types.js';
  import ProductGrid from '$lib/components/product/ProductGrid.svelte';
  import ProductSort from '$lib/components/product/ProductSort.svelte';
  import ProductPagination from '$lib/components/product/ProductPagination.svelte';
  import SeoMeta from '$lib/components/SeoMeta.svelte';

  let { data }: { data: PageData } = $props();
</script>

<SeoMeta
  title="{data.categoryName} | Store"
  description="Browse {data.categoryName} products"
/>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-[var(--color-text)]">{data.categoryName}</h1>
    <ProductSort current={data.sort} />
  </div>

  {#if data.products.length === 0}
    <div class="text-center py-16">
      <p class="text-lg text-[var(--color-text-secondary)]">No products in this category</p>
    </div>
  {:else}
    <ProductGrid products={data.products} columns={4} showAddToCart={true} showDiscountBadge={true} />
    <ProductPagination page={data.page} total={data.total} limit={data.limit} />
  {/if}
</div>