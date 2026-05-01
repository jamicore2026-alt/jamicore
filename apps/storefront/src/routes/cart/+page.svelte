<script lang="ts">
  import type { PageData } from './$types.js';
  import { formatPrice } from '$lib/utils/format.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Minus, Plus, Trash2, ShoppingCart } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { getCookie } from '$lib/api/client.js';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
  let cart = $state(data.cart);
  let updating = $state<Set<string>>(new Set());

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    updating.add(itemId);
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch(`/api/v1/public/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        const d = await res.json();
        cart = d.cart;
      }
    } catch (err) {
      console.error('Cart quantity update failed:', err);
    } finally {
      updating.delete(itemId);
    }
  }

  async function removeItem(itemId: string) {
    updating.add(itemId);
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch(`/api/v1/public/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        credentials: 'include',
      });
      if (res.ok) {
        const d = await res.json();
        cart = d.cart;
      }
    } catch (err) {
      console.error('Cart item removal failed:', err);
    } finally {
      updating.delete(itemId);
    }
  }
</script>

<svelte:head>
  <title>Cart | Store</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <h1 class="text-2xl font-bold text-[var(--color-text)] mb-8">Shopping Cart</h1>

  {#if !cart || !cart.items || cart.items.length === 0}
    <div class="text-center py-16">
      <ShoppingCart class="size-16 mx-auto text-[var(--color-text-secondary)] mb-4" />
      <p class="text-lg text-[var(--color-text-secondary)]">Your cart is empty</p>
      <a href="/products">
        <Button class="mt-4">Continue Shopping</Button>
      </a>
    </div>
  {:else}
    <div class="lg:grid lg:grid-cols-3 lg:gap-8">
      <!-- Cart items -->
      <div class="lg:col-span-2 space-y-4">
        {#each cart.items as item (item.id)}
          <div
            class="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] {updating.has(item.id) ? 'opacity-60' : ''}"
          >
            <div class="shrink-0 w-20 h-20 bg-[var(--color-bg)] rounded-[var(--radius-sm)] flex items-center justify-center overflow-hidden">
              {#if item.product?.images}
                <img src={Array.isArray(item.product.images) ? item.product.images[0] ?? '' : item.product.images.split(',')[0]?.trim()} alt={item.product.titleEn} class="w-full h-full object-cover" />
              {:else}
                <span class="text-xs text-[var(--color-text-secondary)]">{item.productId.slice(0, 8)}</span>
              {/if}
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-[var(--color-text)] truncate">{item.product?.titleEn ?? item.productId}</p>
              {#if item.bundle}
                <p class="text-xs text-[var(--color-primary)] font-medium">Bundle — {formatPrice(item.bundle.price)}</p>
                <div class="mt-1 space-y-0.5">
                  {#each item.bundle.items ?? [] as bi (bi.id)}
                    <p class="text-[11px] text-[var(--color-text-secondary)] truncate">{bi.product?.titleEn ?? 'Product'} × {bi.quantity}</p>
                  {/each}
                </div>
              {:else}
                <p class="text-sm text-[var(--color-text-secondary)]">{formatPrice(item.price)} each</p>
                {#if item.modifiers}
                  <p class="text-xs text-[var(--color-text-secondary)] mt-1">
                    {#if item.modifiers.variantOptionIds?.length}
                      Variant: {item.modifiers.variantOptionIds.length} option(s)
                    {/if}
                    {#if item.modifiers.modifierOptionIds?.length}
                      Modifiers: {item.modifiers.modifierOptionIds.length}
                    {/if}
                  </p>
                {/if}
              {/if}
            </div>

            <div class="flex items-center border border-[var(--color-border)] rounded-[var(--radius-sm)]">
              <button
                class="px-2 py-1 text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                onclick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1 || updating.has(item.id)}
                aria-label="Decrease quantity"
              >
                <Minus class="size-3" />
              </button>
              <span class="px-3 text-sm font-medium">{item.quantity}</span>
              <button
                class="px-2 py-1 text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                onclick={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={updating.has(item.id)}
                aria-label="Increase quantity"
              >
                <Plus class="size-3" />
              </button>
            </div>

            <span class="text-sm font-semibold text-[var(--color-text)] min-w-[80px] text-right">
              {formatPrice(item.total)}
            </span>

            <button
              class="text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors p-1"
              onclick={() => removeItem(item.id)}
              disabled={updating.has(item.id)}
              aria-label="Remove item"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        {/each}
      </div>

      <!-- Cart summary -->
      <div class="mt-8 lg:mt-0">
        <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-6 sticky top-24">
          <h2 class="text-lg font-semibold text-[var(--color-text)] mb-4">Order Summary</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-[var(--color-text-secondary)]">Subtotal ({cart.itemCount} items)</span>
              <span class="text-[var(--color-text)] font-medium">{formatPrice(cart.subtotal)}</span>
            </div>
            {#if parseFloat(cart.couponDiscount) > 0}
              <div class="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(cart.couponDiscount)}</span>
              </div>
            {/if}
            <div class="flex justify-between">
              <span class="text-[var(--color-text-secondary)]">Shipping</span>
              <span class="text-[var(--color-text-secondary)]">Calculated at checkout</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-secondary)]">Tax</span>
              <span class="text-[var(--color-text-secondary)]">Calculated at checkout</span>
            </div>
            <div class="border-t border-[var(--color-border)] pt-3 flex justify-between">
              <span class="font-semibold text-[var(--color-text)]">Total</span>
              <span class="font-bold text-lg text-[var(--color-primary)]">{formatPrice(cart.total)}</span>
            </div>
          </div>
          <a href="/checkout/shipping">
            <Button class="w-full mt-6" size="lg">
              Proceed to Checkout
            </Button>
          </a>
          <a href="/products" class="block mt-3">
            <Button variant="outline" class="w-full">Continue Shopping</Button>
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>