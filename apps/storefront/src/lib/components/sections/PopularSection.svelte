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
    title = 'Best Sellers',
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
  <div class="flex items-center justify-between mb-8">
    <h2
      class="text-2xl sm:text-3xl font-semibold text-[var(--color-text)]"
      style="font-family: var(--font-family);"
    >
      {title}
    </h2>
    <a
      href="/products?sort=popular"
      class="text-sm text-[var(--color-primary)] hover:underline font-medium"
    >
      View all →
    </a>
  </div>

  {#if products.length === 0}
    <p class="text-[var(--color-text-secondary)] text-center py-8">
      No popular products yet.
    </p>
  {:else}
    <div class={cn('grid gap-4 sm:gap-6', colsClass)}>
      {#each products as product, rank (product.id)}
        <div class="relative">
          {#if rank < 3}
            <span
              class="absolute -top-2 -left-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-secondary)] text-white text-xs font-bold shadow-sm"
            >
              {rank + 1}
            </span>
          {/if}
          <ProductCard
            {product}
            {themeType}
            {showAddToCart}
            {showDiscountBadge}
          />
        </div>
      {/each}
    </div>
  {/if}
</section>
