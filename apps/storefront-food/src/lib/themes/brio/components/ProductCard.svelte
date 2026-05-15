<script lang="ts">
  import type { Customization } from '../themeTokens';
  import { getTokens, btnClasses, btnStyle } from '../themeTokens';

  interface Props {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    isVegetarian?: boolean;
    storeSlug?: string;
    customization?: Customization;
  }

  let { id, name, description = '', price, image = '', isVegetarian = false, storeSlug = '', customization = {} }: Props = $props();

  const t = $derived(getTokens(customization));
  const href = $derived(storeSlug ? `/store/${storeSlug}/brio/product/${id}` : `/menu/${id}`);
</script>

<div
  class="overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
  style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; box-shadow: {t.shadowCss};"
>
  <a href={href} class="block relative aspect-video overflow-hidden" style="background-color: {t.bgColor};">
    {#if image}
      <img src={image} alt={name} class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
    {:else}
      <div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
    {/if}
    {#if isVegetarian}
      <span
        class="absolute top-2 left-2 text-xs px-2 py-0.5 font-medium"
        style="background-color: {t.primaryLight}; color: {t.primaryColor}; border-radius: {t.radiusPx};"
      >
        Veg
      </span>
    {/if}
  </a>

  <div class="p-4">
    <a href={href}>
      <h3 class="font-semibold text-base mb-1 hover:opacity-80 transition-opacity" style="color: {t.textColor};">{name}</h3>
    </a>
    {#if description}
      <p class="text-sm line-clamp-2 mb-3" style="color: {t.textMuted};">{description}</p>
    {/if}
    <div class="flex items-center justify-between gap-2">
      <span class="font-bold text-lg shrink-0" style="color: {t.textColor};">${price.toFixed(2)}</span>
      <a
        href={href}
        class={btnClasses(t)}
        style="{btnStyle(t)} border-radius: {t.buttonStyle === 'rounded' ? '9999px' : t.radiusPx};"
      >
        View
      </a>
    </div>
  </div>
</div>
