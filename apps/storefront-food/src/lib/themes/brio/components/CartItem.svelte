<script lang="ts">
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import type { Customization } from '../themeTokens';
  import { getTokens } from '../themeTokens';

  interface Variant {
    name: string;
    value: string;
  }

  interface Props {
    title: string;
    price: number;
    qty: number;
    image?: string;
    variants?: Variant[];
    instructions?: string;
    onUpdateQty?: (delta: number) => void;
    onRemove?: () => void;
    customization?: Customization;
  }

  let {
    title,
    price,
    qty,
    image = '',
    variants = [],
    instructions = '',
    onUpdateQty,
    onRemove,
    customization = {},
  }: Props = $props();

  const t = $derived(getTokens(customization));
  const lineTotal = $derived(price * qty);
</script>

<div class="p-4 flex gap-4" style="border-bottom: 1px solid {t.borderColor};">
  <!-- Product Image -->
  <div
    class="w-20 h-20 flex-shrink-0 overflow-hidden"
    style="background-color: {t.bgColor}; border-radius: {t.radiusPx};"
  >
    {#if image}
      <img src={image} alt={title} class="w-full h-full object-cover" />
    {:else}
      <div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
    {/if}
  </div>

  <!-- Details -->
  <div class="flex-1 min-w-0">
    <h3 class="font-semibold truncate text-base" style="color: {t.textColor};">{title}</h3>

    {#if variants.length > 0}
      <p class="text-xs mt-0.5 truncate" style="color: {t.textMuted};">
        {variants.map((v) => `${v.name}: ${v.value}`).join(', ')}
      </p>
    {/if}

    {#if instructions}
      <p class="text-xs mt-0.5 truncate" style="color: {t.textMuted};">Note: {instructions}</p>
    {/if}

    <div class="flex items-center justify-between mt-3 flex-wrap gap-2">
      <!-- Quantity Controls -->
      <div class="flex items-center gap-2">
        <button
          class="w-7 h-7 flex items-center justify-center transition-colors hover:opacity-80"
          style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
          onclick={() => onUpdateQty?.(-1)}
          aria-label="Decrease quantity"
        >
          <Minus class="w-3 h-3" style="color: {t.textColor};" />
        </button>

        <span class="w-6 text-center text-sm font-medium" style="color: {t.textColor};">{qty}</span>

        <button
          class="w-7 h-7 flex items-center justify-center transition-colors hover:opacity-80"
          style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
          onclick={() => onUpdateQty?.(1)}
          aria-label="Increase quantity"
        >
          <Plus class="w-3 h-3" style="color: {t.textColor};" />
        </button>
      </div>

      <!-- Line Total + Remove -->
      <div class="flex items-center gap-3 shrink-0">
        <span class="font-semibold" style="color: {t.textColor};">${lineTotal.toFixed(2)}</span>
        <button
          class="p-1.5 rounded transition-colors"
          style="color: {t.textMuted};"
          onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
          onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
          onclick={() => onRemove?.()}
          aria-label="Remove item"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</div>
