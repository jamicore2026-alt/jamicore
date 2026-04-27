<script lang="ts">
  import type { PageData } from './$types.js';
  import { sections } from '$lib/components/sections/index.js';
  import RecentlyViewedSection from '$lib/components/sections/RecentlyViewedSection.svelte';
  import { recentlyViewed } from '$lib/stores/recentlyViewed.svelte';
  import SeoMeta from '$lib/components/SeoMeta.svelte';

  let { data }: { data: PageData } = $props();

  let themeType = $derived((data.themeType ?? 'appliances') as import('@repo/ui/themes').ThemeType);
</script>

<SeoMeta
  title={data.store?.name ?? 'Store'}
  description={data.store?.description ?? 'Welcome to our store'}
/>

{#each data.homeSections as sectionName}
  {@const Section = sections[sectionName]}
  {#if Section}
    {#if sectionName === 'HeroSection' || sectionName === 'ProductHeroSection'}
      <Section
        heroType={data.store?.heroType ?? 'static'}
        slides={[]}
      />
    {:else if sectionName === 'FoodHeroSection' || sectionName === 'EditorialHeroSection'}
      <Section
        heroType={data.store?.heroType ?? 'static'}
        slides={[]}
      />
    {:else if sectionName === 'FeaturedDishesSection' || sectionName === 'FeaturedSpecsSection' || sectionName === 'FeaturedProductsSection'}
      <Section
        products={data.featuredProducts}
        themeType={themeType}
        columns={data.store?.defaultColumns ?? 4}
        showAddToCart={data.store?.showAddToCartOnCard ?? true}
        showDiscountBadge={data.store?.showDiscountBadge ?? true}
        title={sectionName === 'FeaturedDishesSection' ? 'Featured Dishes' : 'Featured Products'}
      />
    {:else if sectionName === 'NewArrivalsSection'}
      <Section
        products={data.newArrivals}
        themeType={themeType}
        columns={data.store?.defaultColumns ?? 4}
        showAddToCart={data.store?.showAddToCartOnCard ?? true}
        showDiscountBadge={data.store?.showDiscountBadge ?? true}
      />
    {:else if sectionName === 'PopularSection' || sectionName === 'TrendingSection'}
      <Section
        products={data.featuredProducts}
        themeType={themeType}
        columns={data.store?.defaultColumns ?? 4}
        showAddToCart={data.store?.showAddToCartOnCard ?? true}
        showDiscountBadge={data.store?.showDiscountBadge ?? true}
        title={sectionName === 'TrendingSection' ? 'Trending Now' : 'Best Sellers'}
      />
    {:else if sectionName === 'CategoryMenuSection' || sectionName === 'CategoryStyleGrid' || sectionName === 'ShopByCategorySection'}
      <Section
        categories={data.categories}
        columns={data.store?.defaultColumns ?? 4}
      />
    {:else}
      <Section themeType={themeType} />
    {/if}
  {/if}
{/each}

<RecentlyViewedSection
  products={recentlyViewed.items}
  themeType={themeType}
  columns={data.store?.defaultColumns ?? 4}
/>