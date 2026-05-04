<script lang="ts">
  import type { Cart } from '@repo/shared-types';
  import { formatPrice } from '$lib/utils/format.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { X, ShoppingCart } from '@lucide/svelte';
  import { updateCartItemQuantity, removeCartItem } from '$lib/stores/cart.svelte';
  import CartItem from './CartItem.svelte';

  interface Props {
    cart: Cart | null;
    open: boolean;
    onClose: () => void;
  }

  let { cart, open, onClose }: Props = $props();

  let updating = $state<Set<string>>(new Set());

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    updating.add(itemId);
    try {
      await updateCartItemQuantity(itemId, quantity);
    } catch {
      // failed
    } finally {
      updating.delete(itemId);
    }
  }

  async function removeItem(itemId: string) {
    updating.add(itemId);
    try {
      await removeCartItem(itemId);
    } catch {
      // failed
    } finally {
      updating.delete(itemId);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
    onclick={onClose}
    role="presentation"
  ></div>

  <!-- Drawer -->
  <div
    class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--color-bg)] shadow-2xl flex flex-col transition-transform duration-300 ease-out translate-x-0"
    role="dialog"
    aria-modal="true"
    aria-label="Shopping cart"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
      <h2 class="text-lg font-semibold text-[var(--color-text)]">Cart ({cart?.itemCount ?? 0})</h2>
      <Button variant="ghost" size="icon" onclick={onClose} aria-label="Close cart">
        <X class="size-5" />
      </Button>
    </div>

    <!-- Items -->
    <div class="flex-1 overflow-y-auto px-6 py-4">
      {#if !cart || !cart.items || cart.items.length === 0}
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart class="size-16 text-[var(--color-text-secondary)] mb-4" />
          <p class="text-[var(--color-text-secondary)] font-medium">Your cart is empty</p>
          <p class="text-sm text-[var(--color-text-secondary)]/70 mt-1">Add some items to get started</p>
          <Button variant="outline" class="mt-6" onclick={onClose}>
            Continue Shopping
          </Button>
        </div>
      {:else}
        <div class="space-y-4">
          {#each cart.items as item (item.id)}
            <CartItem
              {item}
              updating={updating.has(item.id)}
              onUpdateQuantity={(q) => updateQuantity(item.id, q)}
              onRemove={() => removeItem(item.id)}
            />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    {#if cart && cart.items.length > 0}
      <div class="border-t border-[var(--color-border)] px-6 py-4 space-y-3 shrink-0 bg-[var(--color-surface)]">
        <div class="flex justify-between text-sm">
          <span class="text-[var(--color-text-secondary)]">Subtotal</span>
          <span class="font-semibold text-[var(--color-text)]">{formatPrice(cart.subtotal)}</span>
        </div>
        <a href="/cart" onclick={onClose}>
          <Button variant="outline" class="w-full" size="sm">View Cart</Button>
        </a>
        <a href="/checkout/shipping" onclick={onClose}>
          <Button class="w-full" size="sm">Checkout</Button>
        </a>
      </div>
    {/if}
  </div>
{/if}
