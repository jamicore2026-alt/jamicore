<script lang="ts">
  import Hero from '../components/Hero.svelte';
  import StorySection from '../components/StorySection.svelte';
  import ProductCard from '../components/ProductCard.svelte';
  import CafeInfo from '../components/CafeInfo.svelte';
  import { getTokens } from '../themeTokens';

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
  const customization = $derived((theme.customization as Record<string, string>) || {});
  const t = $derived(getTokens(customization));
</script>

<Hero
  headline={(theme.heroHeadline as string) || undefined}
  subtitle={(theme.heroSubtitle as string) || undefined}
  ctaLabel={(theme.heroButtonText as string) || undefined}
  ctaHref={`/store/${storeSlug}/brio/menu`}
  backgroundImage={(theme.heroImageUrl as string) || undefined}
  {customization}
/>

<StorySection story={(theme.storyText as string) || undefined} {customization} />

{#if featuredProducts.length > 0}
  <section class="{t.spacingClass} px-4" style="background-color: {t.bgColor};">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl md:text-3xl font-bold mb-8 text-center" style="color: {t.textColor};">
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
            {customization}
          />
        {/each}
      </div>
    </div>
  </section>
{/if}

<section class="{t.spacingClass} px-4" style="background-color: {t.cardBg};">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold mb-4" style="color: {t.textColor};">Visit Us</h2>
        <p class="text-sm mb-6" style="color: {t.textMuted};">
          Come experience the difference. Fresh ingredients, warm atmosphere, and friendly service.
        </p>
        <CafeInfo
          phone={String(theme.contactPhone || '')}
          address={String(theme.contactAddress || '')}
          hours={String(theme.contactHours || '')}
          mapEmbedUrl={String(theme.googleMapsUrl || '')}
          {customization}
        />
      </div>
    </div>
  </div>
</section>
