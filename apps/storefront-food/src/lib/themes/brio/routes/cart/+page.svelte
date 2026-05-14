<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import CartItem from '../../components/CartItem.svelte';
  import CartSummary from '../../components/CartSummary.svelte';

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
  <h1 class="text-2xl font-bold mb-6" style="color: #1a1a1a;">Your Cart</h1>

  {#if cartItems.length === 0}
    <div
      class="text-center py-16 bg-white border"
      style="border-color: #e5e5e5; border-radius: 4px;"
    >
      <p class="text-lg font-medium" style="color: #666666;">Your cart is empty</p>
      <p class="text-sm mt-1" style="color: #666666;">Add some delicious food to get started</p>
      <button
        onclick={() => goto('/menu')}
        class="mt-4 px-6 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        style="background-color: #1a4d2e; border-radius: 4px;"
      >
        Browse Menu
      </button>
    </div>
  {:else}
    <div class="space-y-4">
      <div
        class="bg-white border overflow-hidden"
        style="border-color: #e5e5e5; border-radius: 4px;"
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
          />
        {/each}
      </div>

      <CartSummary {subtotal} />

      <button
        onclick={() => goto('/checkout')}
        class="w-full py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
        style="background-color: #1a4d2e; border-radius: 4px;"
      >
        Proceed to Checkout
      </button>
    </div>
  {/if}
</div>
