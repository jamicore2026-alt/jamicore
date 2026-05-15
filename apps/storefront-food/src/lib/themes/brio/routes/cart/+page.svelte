<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import CartItem from '../../components/CartItem.svelte';
  import CartSummary from '../../components/CartSummary.svelte';
  import { getTokens, btnClasses, btnStyle } from '../../themeTokens';

  interface Props {
    data?: Record<string, unknown> & { theme?: Record<string, unknown> };
  }

  let { data = {} }: Props = $props();

  const storeSlug = $derived(String((data as Record<string, unknown>).slug || ((data as Record<string, unknown>).store as Record<string, unknown>)?.domain || ''));
  const menuPath = $derived(storeSlug ? `/store/${storeSlug}/brio/menu` : '/menu');
  const customization = $derived((data.theme?.customization as Record<string, string>) || {});
  const t = $derived(getTokens(customization));

  interface CartItemData {
    id: string;
    title: string;
    price: number;
    qty: number;
    image?: string;
    variants?: Array<{ name: string; value: string }>;
    instructions?: string;
  }

  let cartItems = $state<CartItemData[]>([]);

  onMount(() => {
    loadCart();
    window.addEventListener('cart-updated', loadCart);
    return () => window.removeEventListener('cart-updated', loadCart);
  });

  function loadCart() {
    try {
      cartItems = JSON.parse(localStorage.getItem('food-cart') || '[]');
    } catch {
      cartItems = [];
    }
  }

  function updateQty(index: number, delta: number) {
    const item = cartItems[index];
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) {
      cartItems = cartItems.filter((_, i) => i !== index);
    }
    saveCart();
  }

  function removeItem(index: number) {
    cartItems = cartItems.filter((_, i) => i !== index);
    saveCart();
  }

  function saveCart() {
    localStorage.setItem('food-cart', JSON.stringify(cartItems));
    window.dispatchEvent(new CustomEvent('cart-updated'));
  }

  const subtotal = $derived(cartItems.reduce((sum, item) => sum + item.price * item.qty, 0));
</script>

<div class="max-w-2xl mx-auto py-8 px-4">
  <h1 class="text-2xl font-bold mb-6" style="color: {t.textColor};">Your Cart</h1>

  {#if cartItems.length === 0}
    <div
      class="text-center py-16"
      style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
    >
      <p class="text-lg font-medium" style="color: {t.textMuted};">Your cart is empty</p>
      <p class="text-sm mt-1" style="color: {t.textMuted};">Add some delicious food to get started</p>
      <button
        onclick={() => goto(menuPath)}
        class="mt-4 {btnClasses(t)}"
        style="{btnStyle(t)} border-radius: {t.buttonStyle === 'rounded' ? '9999px' : t.radiusPx};"
      >
        Browse Menu
      </button>
    </div>
  {:else}
    <div class="space-y-4">
      <div
        class="overflow-hidden"
        style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; box-shadow: {t.shadowCss};"
      >
        {#each cartItems as item, i}
          <CartItem
            title={item.title}
            price={item.price}
            qty={item.qty}
            image={item.image}
            variants={item.variants}
            instructions={item.instructions}
            onUpdateQty={(delta: number) => updateQty(i, delta)}
            onRemove={() => removeItem(i)}
            {customization}
          />
        {/each}
      </div>

      <CartSummary {subtotal} {customization} />

      <button
        onclick={() => goto(`${storeSlug ? `/store/${storeSlug}/brio/checkout` : '/checkout'}`)}
        class="w-full {btnClasses(t)}"
        style="{btnStyle(t)} border-radius: {t.buttonStyle === 'rounded' ? '9999px' : t.radiusPx};"
      >
        Proceed to Checkout
      </button>
    </div>
  {/if}
</div>
