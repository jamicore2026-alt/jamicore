<script lang="ts">
  import type { Customization } from '../themeTokens';
  import { getTokens } from '../themeTokens';

  interface Props {
    name: string;
    image?: string;
    productCount: number;
    storeSlug?: string;
    slug?: string;
    icon?: string;
    customization?: Customization;
  }

  let { name, image = '', productCount, storeSlug = '', slug = '', icon = '', customization = {} }: Props = $props();

  const t = $derived(getTokens(customization));
  const href = $derived(storeSlug && slug ? `/store/${storeSlug}/brio/menu/${slug}` : `/menu/${slug}`);
</script>

<a
  href={href}
  class="block overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
  style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; box-shadow: {t.shadowCss};"
>
  <div class="aspect-[4/3] overflow-hidden" style="background-color: {t.bgColor};">
    {#if image}
      <img src={image} alt={name} class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
    {:else if icon}
      <div class="w-full h-full flex items-center justify-center text-4xl">{icon}</div>
    {:else}
      <div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
    {/if}
  </div>
  <div class="p-4">
    <h3 class="font-semibold text-base mb-1" style="color: {t.textColor};">{name}</h3>
    <p class="text-sm" style="color: {t.textMuted};">
      {productCount} {productCount === 1 ? 'item' : 'items'}
    </p>
  </div>
</a>
