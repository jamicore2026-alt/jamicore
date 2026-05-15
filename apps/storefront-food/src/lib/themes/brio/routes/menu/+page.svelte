<script lang="ts">
  import CategoryCard from '../../components/CategoryCard.svelte';
  import { getTokens } from '../../themeTokens';

  interface Props {
    data: {
      categories?: Array<Record<string, unknown>>;
      theme?: Record<string, unknown>;
      store?: { domain?: string } | null;
      slug?: string;
    };
  }

  let { data }: Props = $props();

  const categories = $derived((data.categories || []) as Array<Record<string, unknown>>);
  const storeSlug = $derived(data.slug || data.store?.domain || '');
  const customization = $derived((data.theme?.customization as Record<string, string>) || {});
  const t = $derived(getTokens(customization));
</script>

<section class="{t.spacingClass} px-4" style="background-color: {t.bgColor};">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: {t.textColor};">Our Menu</h1>
    {#if categories.length === 0}
      <p class="text-sm" style="color: {t.textMuted};">No categories available.</p>
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
            {customization}
          />
        {/each}
      </div>
    {/if}
  </div>
</section>
