<script lang="ts">
  import Hero from '../components/Hero.svelte';
  import StorySection from '../components/StorySection.svelte';
  import ProductCard from '../components/ProductCard.svelte';
  import CafeInfo from '../components/CafeInfo.svelte';

  interface Props {
    data: {
      theme?: Record<string, unknown>;
      featuredProducts?: Array<Record<string, unknown>>;
      store?: { domain?: string } | null;
      slug?: string;
    };
  }

  let { data }: Props = $props();

  const theme = $derived((data.theme || {}) as Record<string, unknown>);
  const featuredProducts = $derived((data.featuredProducts || []) as Array<Record<string, unknown>>);
  const storeSlug = $derived(data.slug || data.store?.domain || '');
</script>

<Hero
  headline={(theme.heroHeadline as string) || undefined}
  subtitle={(theme.heroSubtitle as string) || undefined}
  ctaLabel={(theme.heroCtaLabel as string) || undefined}
  ctaHref={(theme.heroCtaHref as string) || undefined}
  backgroundImage={(theme.heroBackgroundImage as string) || undefined}
/>

<StorySection story={(theme.story as string) || undefined} />

{#if featuredProducts.length > 0}
  <section class="py-16 px-4" style="background-color: #f9f9f9;">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl md:text-3xl font-bold mb-8 text-center" style="color: #1a1a1a;">
        {(theme.featuredTitle as string) || 'Featured Dishes'}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {#each featuredProducts as product}
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
    </div>
  </section>
{/if}

<section class="py-16 px-4" style="background-color: #ffffff;">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold mb-4" style="color: #1a1a1a;">Visit Us</h2>
        <p class="text-sm mb-6" style="color: #666666;">
          Come experience the Brio difference. Fresh ingredients, warm atmosphere, and friendly service.
        </p>
        <CafeInfo
          phone={String(theme.contactPhone || '')}
          address={String(theme.contactAddress || '')}
          hours={String(theme.contactHours || '')}
        />
      </div>
    </div>
  </div>
</section>
