<script lang="ts">
  import CategoryCard from '../../components/CategoryCard.svelte';

  interface Props {
    data: {
      categories?: Array<Record<string, unknown>>;
      store?: { domain?: string } | null;
      slug?: string;
    };
  }

  let { data }: Props = $props();

  const categories = $derived((data.categories || []) as Array<Record<string, unknown>>);
  const storeSlug = $derived(data.slug || data.store?.domain || '');
</script>

<section class="py-16 px-4" style="background-color: #ffffff;">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: #1a1a1a;">Our Menu</h1>
    {#if categories.length === 0}
      <p class="text-sm" style="color: #666666;">No categories available.</p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {#each categories as category}
          <CategoryCard
            name={String(category.nameEn || category.name || '')}
            image={String(category.image || '')}
            productCount={Number(category.productCount || 0)}
            storeSlug={storeSlug}
            slug={String(category.slug || category.id || '')}
            icon={String(category.icon || '')}
          />
        {/each}
      </div>
    {/if}
  </div>
</section>
