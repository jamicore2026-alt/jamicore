<script lang="ts">
  import type { ProductListItem } from '@repo/shared-types';
  import type { ThemeType } from '@repo/ui/themes';
  import ProductGrid from '$lib/components/product/ProductGrid.svelte';

  interface Props {
    products: ProductListItem[];
    themeType?: ThemeType;
    columns?: 2 | 3 | 4;
  }

  let { products, themeType = 'appliances', columns = 4 }: Props = $props();
</script>

{#if products.length > 0}
  <section class="py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-2xl font-bold text-[var(--color-text)] mb-6">Recently Viewed</h2>
      <ProductGrid {products} {themeType} {columns} />
    </div>
  </section>
{/if}
