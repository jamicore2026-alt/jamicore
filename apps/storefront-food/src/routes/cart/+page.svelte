<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart';

  interface CartVariant {
    name: string;
    value: string;
  }

  interface CartItem {
    id: string;
    title: string;
    price: string | number;
    image: string | null;
    qty: number;
    variants: CartVariant[];
    instructions?: string;
  }

  let cartItems = $state<CartItem[]>([]);

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

  const subtotal = $derived(cartItems.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0));
  const deliveryFee = $derived(subtotal > 25 ? 0 : 3.99);
  const total = $derived(subtotal + deliveryFee);
</script>

<div class="max-w-2xl mx-auto">
  <h1 class="text-2xl font-bold mb-6">Your Cart</h1>

  {#if cartItems.length === 0}
    <div class="text-center py-16 bg-white rounded-2xl border">
      <ShoppingCart class="w-16 h-16 mx-auto mb-4 text-neutral-300" />
      <p class="text-lg font-medium text-neutral-500">Your cart is empty</p>
      <p class="text-sm text-neutral-400 mt-1">Add some delicious food to get started</p>
      <button
        onclick={() => goto('/menu')}
        class="mt-4 bg-orange-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-orange-700 transition-colors"
      >
        Browse Menu
      </button>
    </div>
  {:else}
    <div class="space-y-4">
      <!-- Cart Items -->
      <div class="bg-white rounded-2xl border divide-y">
        {#each cartItems as item, i}
          <div class="p-4 flex gap-4">
            <div class="w-20 h-20 rounded-xl bg-neutral-100 flex-shrink-0 overflow-hidden">
              {#if item.image}
                <img src={item.image} alt={item.title} class="w-full h-full object-cover" />
              {:else}
                <div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold truncate">{item.title}</h3>
              {#if item.variants?.length}
                <p class="text-xs text-neutral-500 mt-0.5">{item.variants.map((v: CartVariant) => `${v.name}: ${v.value}`).join(', ')}</p>
              {/if}
              {#if item.instructions}
                <p class="text-xs text-neutral-400 mt-0.5 truncate">Note: {item.instructions}</p>
              {/if}
              <div class="flex items-center justify-between mt-2">
                <div class="flex items-center gap-2">
                  <button
                    onclick={() => updateQty(i, -1)}
                    class="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100"
                  >
                    <Minus class="w-3 h-3" />
                  </button>
                  <span class="w-6 text-center text-sm font-medium">{item.qty}</span>
                  <button
                    onclick={() => updateQty(i, 1)}
                    class="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100"
                  >
                    <Plus class="w-3 h-3" />
                  </button>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-semibold">${(Number(item.price) * item.qty).toFixed(2)}</span>
                  <button
                    onclick={() => removeItem(i)}
                    class="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Summary -->
      <div class="bg-white rounded-2xl border p-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-neutral-500">Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-neutral-500">Delivery</span>
          <span>{deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</span>
        </div>
        <div class="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onclick={() => goto('/checkout')}
        class="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 active:scale-95 transition-all"
      >
        Proceed to Checkout
      </button>
    </div>
  {/if}
</div>
