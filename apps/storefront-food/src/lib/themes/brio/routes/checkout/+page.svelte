<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Clock from '@lucide/svelte/icons/clock';
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
    variants?: Array<{ name: string; value: string }>;
    instructions?: string;
  }

  let cartItems = $state<CartItemData[]>([]);

  onMount(() => {
    try {
      cartItems = JSON.parse(localStorage.getItem('food-cart') || '[]');
    } catch {
      cartItems = [];
    }
  });

  let name = $state('');
  let phone = $state('');
  let email = $state('');
  let deliveryType = $state<'delivery' | 'dinein'>('delivery');
  let address = $state('');
  let tableNumber = $state('');
  let deliveryTime = $state('asap');

  const subtotal = $derived(cartItems.reduce((sum, item) => sum + item.price * item.qty, 0));

  async function placeOrder() {
    if (!name || !phone || (deliveryType === 'delivery' && !address)) {
      alert('Please fill in all required fields');
      return;
    }

    const backendDeliveryType = deliveryType === 'dinein' ? 'pickup' : deliveryType;

    try {
      const res = await fetch('/api/v1/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.qty,
            price: item.price,
            variants: item.variants,
          })),
          customerName: name,
          customerPhone: phone,
          shippingAddress:
            deliveryType === 'delivery'
              ? address
              : `Dine-in - Table ${tableNumber || 'N/A'}`,
          deliveryType: backendDeliveryType,
          deliveryTime,
          paymentMethod: 'cod',
          total: String(subtotal.toFixed(2)),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to place order');
        return;
      }

      const data = await res.json();
      const orderId = data.order?.id;

      localStorage.removeItem('food-cart');
      window.dispatchEvent(new CustomEvent('cart-updated'));
      goto(`/order-confirmed/${orderId}`);
    } catch {
      alert('Network error. Please try again.');
    }
  }
</script>

<div class="max-w-xl mx-auto py-8 px-4">
  <h1 class="text-2xl font-bold mb-6" style="color: {t.textColor};">Checkout</h1>

  {#if cartItems.length === 0}
    <div class="text-center py-16">
      <p style="color: {t.textMuted};">Your cart is empty</p>
      <a
        href={menuPath}
        class="text-sm font-medium hover:opacity-80 transition-opacity mt-2 inline-block"
        style="color: {t.primaryColor};"
      >
        Browse Menu
      </a>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Delivery Type -->
      <div
        class="p-4"
        style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
      >
        <p class="text-sm font-medium mb-3 block" style="color: {t.textColor};">
          Delivery Type
        </p>
        <div class="flex gap-3 flex-wrap">
          <button
            class="flex-1 min-w-[120px] py-3 border text-sm font-medium transition-colors"
            style="border-color: {deliveryType === 'delivery' ? t.primaryColor : t.borderColor}; background-color: {deliveryType === 'delivery' ? t.primaryLight : t.cardBg}; color: {deliveryType === 'delivery' ? t.primaryColor : t.textColor}; border-radius: {t.radiusPx};"
            onclick={() => (deliveryType = 'delivery')}
          >
            <MapPin class="w-4 h-4 mx-auto mb-1" />
            Delivery
          </button>
          <button
            class="flex-1 min-w-[120px] py-3 border text-sm font-medium transition-colors"
            style="border-color: {deliveryType === 'dinein' ? t.primaryColor : t.borderColor}; background-color: {deliveryType === 'dinein' ? t.primaryLight : t.cardBg}; color: {deliveryType === 'dinein' ? t.primaryColor : t.textColor}; border-radius: {t.radiusPx};"
            onclick={() => (deliveryType = 'dinein')}
          >
            <Clock class="w-4 h-4 mx-auto mb-1" />
            Dine-in
          </button>
        </div>
      </div>

      <!-- Contact Details -->
      <div
        class="p-4 space-y-4"
        style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
      >
        <h2 class="font-semibold" style="color: {t.textColor};">Contact Details</h2>
        <div class="space-y-3">
          <div>
            <label
              class="text-xs font-medium mb-1 block"
              style="color: {t.textMuted};"
              for="checkout-name"
            >
              Full Name *
            </label>
            <input
              id="checkout-name"
              bind:value={name}
              placeholder="John Doe"
              class="w-full px-3 py-2 text-sm outline-none transition-colors"
              style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
            />
          </div>
          <div>
            <label
              class="text-xs font-medium mb-1 block"
              style="color: {t.textMuted};"
              for="checkout-phone"
            >
              Phone *
            </label>
            <input
              id="checkout-phone"
              bind:value={phone}
              placeholder="+1 234 567 890"
              class="w-full px-3 py-2 text-sm outline-none transition-colors"
              style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
            />
          </div>
          <div>
            <label
              class="text-xs font-medium mb-1 block"
              style="color: {t.textMuted};"
              for="checkout-email"
            >
              Email
            </label>
            <input
              id="checkout-email"
              type="email"
              bind:value={email}
              placeholder="your@email.com"
              class="w-full px-3 py-2 text-sm outline-none transition-colors"
              style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
            />
          </div>

          {#if deliveryType === 'delivery'}
            <div>
              <label
                class="text-xs font-medium mb-1 block"
                style="color: {t.textMuted};"
                for="checkout-address"
              >
                Delivery Address *
              </label>
              <textarea
                id="checkout-address"
                bind:value={address}
                placeholder="123 Main St, Apt 4B"
                rows={2}
                class="w-full px-3 py-2 text-sm outline-none transition-colors resize-none"
                style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
              ></textarea>
            </div>
          {:else}
            <div>
              <label
                class="text-xs font-medium mb-1 block"
                style="color: {t.textMuted};"
                for="checkout-table"
              >
                Table Number
              </label>
              <input
                id="checkout-table"
                bind:value={tableNumber}
                placeholder="e.g., 12"
                class="w-full px-3 py-2 text-sm outline-none transition-colors"
                style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
              />
            </div>
          {/if}
        </div>
      </div>

      <!-- Delivery Time -->
      <div
        class="p-4"
        style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
      >
        <p class="text-sm font-medium mb-3 block" style="color: {t.textColor};">
          Delivery Time
        </p>
        <select
          bind:value={deliveryTime}
          class="w-full px-3 py-2 text-sm outline-none transition-colors"
          style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
        >
          <option value="asap">As soon as possible</option>
          <option value="30">In 30 minutes</option>
          <option value="60">In 1 hour</option>
          <option value="90">In 1.5 hours</option>
          <option value="120">In 2 hours</option>
        </select>
      </div>

      <!-- Order Summary -->
      <div
        class="p-4 space-y-2"
        style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
      >
        <h2 class="font-semibold mb-2" style="color: {t.textColor};">Order Summary</h2>
        {#each cartItems as item}
          <div class="flex justify-between text-sm gap-2">
            <span class="truncate">{item.qty}x {item.title}</span>
            <span class="font-medium shrink-0">${(item.price * item.qty).toFixed(2)}</span>
          </div>
        {/each}
        <div
          class="flex justify-between text-sm pt-2 mt-2"
          style="border-top: 1px solid {t.borderColor};"
        >
          <span class="font-semibold" style="color: {t.textColor};">Total</span>
          <span class="font-bold text-lg" style="color: {t.textColor};">
            ${subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        onclick={placeOrder}
        class="w-full {btnClasses(t)}"
        style="{btnStyle(t)} border-radius: {t.buttonStyle === 'rounded' ? '9999px' : t.radiusPx};"
      >
        Place Order - ${subtotal.toFixed(2)}
      </button>
    </div>
  {/if}
</div>
