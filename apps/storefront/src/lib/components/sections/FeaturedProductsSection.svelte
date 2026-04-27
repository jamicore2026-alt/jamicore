<script lang="ts">
  import type { Product } from '@repo/shared-types';
  import type { ThemeType } from '@repo/ui/themes';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import { cn } from '$lib/utils';

  interface Props {
    products: Product[];
    themeType: ThemeType;
    columns?: number;
    showAddToCart?: boolean;
    showDiscountBadge?: boolean;
    title?: string;
    sectionConfig?: Record<string, unknown>;
  }

  let {
    products,
    themeType,
    columns = 3,
    showAddToCart = true,
    showDiscountBadge = true,
    title = 'Featured Products',
    sectionConfig,
  }: Props = $props();

  const colsClass = $derived(
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  );
</script>

<section class="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
  <h2
    class="text-2xl sm:text-3xl font-semibold text-[var(--color-text)] mb-8"
    style="font-family: var(--font-family);"
  >
    {title}
  </h2>

  {#if products.length === 0}
    <p class="text-[var(--color-text-secondary)] text-center py-8">
      No featured products available yet.
    </p>
  {:else}
    <div class={cn('grid gap-4 sm:gap-6', colsClass)}>
      {#each products as product (product.id)}
        <ProductCard
          {product}
          {themeType}
          {showAddToCart}
          {showDiscountBadge}
        />
      {/each}
    </div>
  {/if}
</section>
