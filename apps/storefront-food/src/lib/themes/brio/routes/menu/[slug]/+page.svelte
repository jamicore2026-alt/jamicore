<script lang="ts">
  import ProductCard from '../../../components/ProductCard.svelte';

  interface Props {
    data: {
      category?: Record<string, unknown> | null;
      products?: Array<Record<string, unknown>>;
      store?: { domain?: string } | null;
      slug?: string;
    };
  }

  let { data }: Props = $props();

  const category = $derived((data.category || {}) as Record<string, unknown>);
  const products = $derived((data.products || []) as Array<Record<string, unknown>>);
  const storeSlug = $derived(data.slug || data.store?.domain || '');
</script>

<section class="py-16 px-4" style="background-color: #ffffff;">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: #1a1a1a;">
      {String(category.nameEn || category.name || 'Menu')}
    </h1>
    {#if products.length === 0}
      <p class="text-sm" style="color: #666666;">No items in this category.</p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {#each products as product}
          <ProductCard
            id={String(product.id || '')}
            name={String(product.name || product.titleEn || product.title || '')}
            description={String(product.description || product.descriptionEn || '')}
            price={Number(product.price || product.salePrice || 0)}
            image={String(product.image || (product.images as string[])?.[0] || '')}
            isVegetarian={Boolean(product.isVegetarian)}
            storeSlug={storeSlug}
          />
        {/each}
      </div>
    {/if}
  </div>
</section>
