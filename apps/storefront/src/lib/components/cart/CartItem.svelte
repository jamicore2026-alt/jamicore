<script lang="ts">
  import type { CartItem } from '@repo/shared-types';
  import { formatPrice } from '$lib/utils/format.js';
  import { Minus, Plus, Trash2, Package } from '@lucide/svelte';

  interface Props {
    item: CartItem;
    updating: boolean;
    onUpdateQuantity: (quantity: number) => void;
    onRemove: () => void;
  }

  let { item, updating, onUpdateQuantity, onRemove }: Props = $props();

  const displayName = $derived(item.bundle?.name ?? item.product?.titleEn ?? item.productId.slice(0, 12));
  const displayImage = $derived(
    Array.isArray(item.product?.images)
      ? item.product.images[0] ?? ''
      : item.product?.images?.split(',')[0]?.trim() ?? ''
  );
</script>

<div class="flex items-center gap-3 {updating ? 'opacity-60' : ''} transition-opacity">
  <div class="shrink-0 w-14 h-14 bg-[var(--color-surface)] rounded-[var(--radius-sm)] flex items-center justify-center border border-[var(--color-border)] overflow-hidden">
    {#if displayImage}
      <img src={displayImage} alt={displayName} class="w-full h-full object-cover" />
    {:else}
      <Package class="size-5 text-[var(--color-text-secondary)]" />
    {/if}
  </div>

  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-[var(--color-text)] truncate">{displayName}</p>

    {#if item.bundle}
      <p class="text-xs text-[var(--color-primary)] font-medium">Bundle — {formatPrice(item.bundle.price)}</p>
      <div class="mt-1 space-y-0.5">
        {#each item.bundle.items ?? [] as bi (bi.id)}
          <p class="text-[11px] text-[var(--color-text-secondary)] truncate">
            {bi.product?.titleEn ?? bi.productId} × {bi.quantity}
          </p>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-[var(--color-text-secondary)]">{formatPrice(item.price)} each</p>
    {/if}

    <div class="flex items-center gap-2 mt-1">
      <button
        class="p-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface)] transition-colors disabled:opacity-40"
        onclick={() => onUpdateQuantity(item.quantity - 1)}
        disabled={item.quantity <= 1 || updating}
        aria-label="Decrease quantity"
      >
        <Minus class="size-3" />
      </button>
      <span class="text-xs font-medium w-6 text-center">{item.quantity}</span>
      <button
        class="p-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface)] transition-colors disabled:opacity-40"
        onclick={() => onUpdateQuantity(item.quantity + 1)}
        disabled={updating}
        aria-label="Increase quantity"
      >
        <Plus class="size-3" />
      </button>
      <button
        class="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] ml-auto transition-colors"
        onclick={onRemove}
        disabled={updating}
        aria-label="Remove item"
      >
        <Trash2 class="size-3.5" />
      </button>
    </div>
  </div>

  <span class="text-sm font-semibold text-[var(--color-text)] shrink-0">{formatPrice(item.total)}</span>
</div>
