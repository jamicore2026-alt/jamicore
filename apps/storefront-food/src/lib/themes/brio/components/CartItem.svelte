<script lang="ts">
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';

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
  }: Props = $props();

  const lineTotal = $derived(price * qty);
</script>

<div class="p-4 flex gap-4" style="border-bottom: 1px solid #e5e5e5;">
  <!-- Product Image -->
  <div
    class="w-20 h-20 flex-shrink-0 overflow-hidden"
    style="background-color: #f5f5f5; border-radius: 4px;"
  >
    {#if image}
      <img src={image} alt={title} class="w-full h-full object-cover" />
    {:else}
      <div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
    {/if}
  </div>

  <!-- Details -->
  <div class="flex-1 min-w-0">
    <h3 class="font-semibold truncate text-base" style="color: #1a1a1a;">{title}</h3>

    {#if variants.length > 0}
      <p class="text-xs mt-0.5 truncate" style="color: #666666;">
        {variants.map((v) => `${v.name}: ${v.value}`).join(', ')}
      </p>
    {/if}

    {#if instructions}
      <p class="text-xs mt-0.5 truncate" style="color: #666666;">Note: {instructions}</p>
    {/if}

    <div class="flex items-center justify-between mt-3">
      <!-- Quantity Controls -->
      <div class="flex items-center gap-2">
        <button
          class="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#e8f5e9]"
          style="border: 1px solid #e5e5e5; border-radius: 4px;"
          onclick={() => onUpdateQty?.(-1)}
          aria-label="Decrease quantity"
        >
          <Minus class="w-3 h-3" style="color: #1a1a1a;" />
        </button>

        <span class="w-6 text-center text-sm font-medium" style="color: #1a1a1a;">{qty}</span>

        <button
          class="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#e8f5e9]"
          style="border: 1px solid #e5e5e5; border-radius: 4px;"
          onclick={() => onUpdateQty?.(1)}
          aria-label="Increase quantity"
        >
          <Plus class="w-3 h-3" style="color: #1a1a1a;" />
        </button>
      </div>

      <!-- Line Total + Remove -->
      <div class="flex items-center gap-3">
        <span class="font-semibold" style="color: #1a1a1a;">${lineTotal.toFixed(2)}</span>
        <button
          class="p-1 transition-colors"
          style="color: #666666;"
          onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
          onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.color = '#666666'; }}
          onclick={() => onRemove?.()}
          aria-label="Remove item"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</div>
