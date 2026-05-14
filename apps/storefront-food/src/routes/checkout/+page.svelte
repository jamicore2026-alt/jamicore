<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Clock from '@lucide/svelte/icons/clock';
  import User from '@lucide/svelte/icons/user';
  import Phone from '@lucide/svelte/icons/phone';
  import CreditCard from '@lucide/svelte/icons/credit-card';
  import Banknote from '@lucide/svelte/icons/banknote';

  let cartItems = $state<any[]>([]);
  let paymentProviders = $state<any[]>([]);

  onMount(() => {
    try {
      cartItems = JSON.parse(localStorage.getItem('food-cart') || '[]');
    } catch {
      cartItems = [];
    }
    loadPaymentProviders();
  });

  async function loadPaymentProviders() {
    try {
      const res = await fetch('/api/v1/public/payments/providers');
      if (res.ok) {
        const data = await res.json();
        paymentProviders = data.providers || [];
      }
    } catch {
      paymentProviders = [];
    }
  }

  let name = $state('');
  let phone = $state('');
  let address = $state('');
  let deliveryType = $state<'delivery' | 'pickup'>('delivery');
  let deliveryTime = $state('asap');
  let tableNumber = $state('');
  let paymentMethod = $state('cod');
  let stripeError = $state('');
  let stripeLoading = $state(false);

  // Stripe elements
  let stripe: any = $state(null);
  let cardElement: any = $state(null);
  let stripeInitialized = $state(false);

  // When Stripe is selected and providers loaded, init Stripe Elements
  $effect(() => {
    const stripeProvider = paymentProviders.find((p: any) => p.provider === 'stripe');
    if (paymentMethod === 'stripe' && stripeProvider?.publishableKey && !stripeInitialized) {
      stripeInitialized = true;
      initStripe(stripeProvider.publishableKey);
    }
  });

  async function initStripe(publishableKey: string) {
    stripeLoading = true;
    try {
      if (!document.getElementById('stripe-js')) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.id = 'stripe-js';
          script.src = 'https://js.stripe.com/v3/';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Stripe'));
          document.body.appendChild(script);
        });
      }
      // @ts-ignore
      stripe = Stripe(publishableKey);
      const elements = stripe.elements();
      cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1a0a00',
            '::placeholder': { color: '#a1a1aa' },
          },
        },
      });
      setTimeout(() => {
        const container = document.getElementById('card-element');
        if (container) cardElement.mount('#card-element');
      }, 0);
    } catch (e: any) {
      stripeError = e.message || 'Failed to load Stripe';
    } finally {
      stripeLoading = false;
    }
  }

  const subtotal = $derived(cartItems.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0));
  const deliveryFee = $derived(deliveryType === 'delivery' && subtotal <= 25 ? 3.99 : 0);
  const total = $derived(subtotal + deliveryFee);

  async function placeOrder() {
    if (!name || !phone || (deliveryType === 'delivery' && !address)) {
      alert('Please fill in all required fields');
      return;
    }

    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

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
            instructions: item.instructions,
          })),
          customerName: name,
          customerPhone: phone,
          shippingAddress: deliveryType === 'delivery' ? address : `Pickup - Table ${tableNumber || 'N/A'}`,
          deliveryType,
          deliveryTime,
          paymentMethod,
          total: String(total.toFixed(2)),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to place order');
        return;
      }

      const data = await res.json();
      const orderId = data.order?.id;

      // COD: done immediately
      if (paymentMethod === 'cod') {
        localStorage.removeItem('food-cart');
        window.dispatchEvent(new CustomEvent('cart-updated'));
        goto(`/order-confirmed/${orderId}`);
        return;
      }

      // Stripe: create payment intent then confirm
      if (paymentMethod === 'stripe') {
        const intentRes = await fetch('/api/v1/public/payments/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId, provider: 'stripe' }),
        });

        if (!intentRes.ok) {
          const err = await intentRes.json();
          stripeError = err.message || 'Payment initiation failed';
          return;
        }

        const intent = await intentRes.json();
        const clientSecret = intent.data?.clientSecret;
        if (!clientSecret || !stripe || !cardElement) {
          stripeError = 'Payment setup incomplete. Please refresh and try again.';
          return;
        }

        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });

        if (result.error) {
          stripeError = result.error.message || 'Payment failed';
          return;
        }

        localStorage.removeItem('food-cart');
        window.dispatchEvent(new CustomEvent('cart-updated'));
        goto(`/order-confirmed/${orderId}`);
        return;
      }

      // Fallback for other providers
      localStorage.removeItem('food-cart');
      window.dispatchEvent(new CustomEvent('cart-updated'));
      goto(`/order-confirmed/${orderId}`);
    } catch {
      alert('Network error. Please try again.');
    }
  }
</script>

<div class="max-w-xl mx-auto">
  <h1 class="text-2xl font-bold mb-6">Checkout</h1>

  {#if cartItems.length === 0}
    <div class="text-center py-16">
      <p class="text-neutral-500">Your cart is empty</p>
      <a href="/menu" class="text-orange-600 hover:underline mt-2 inline-block">Browse Menu</a>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Delivery Type -->
      <div class="bg-white rounded-xl border p-4">
        <label class="text-sm font-medium mb-3 block">Delivery Type</label>
        <div class="flex gap-3">
          <button
            class="flex-1 py-3 rounded-lg border text-sm font-medium transition-colors {deliveryType === 'delivery' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-neutral-200'}"
            onclick={() => deliveryType = 'delivery'}
          >
            <MapPin class="w-4 h-4 mx-auto mb-1" />
            Delivery
          </button>
          <button
            class="flex-1 py-3 rounded-lg border text-sm font-medium transition-colors {deliveryType === 'pickup' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-neutral-200'}"
            onclick={() => deliveryType = 'pickup'}
          >
            <Clock class="w-4 h-4 mx-auto mb-1" />
            Dine-in / Pickup
          </button>
        </div>
      </div>

      <!-- Personal Details -->
      <div class="bg-white rounded-xl border p-4 space-y-4">
        <h2 class="font-semibold">Contact Details</h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-neutral-500 mb-1 block">Full Name *</label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                bind:value={name}
                placeholder="John Doe"
                class="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label class="text-xs text-neutral-500 mb-1 block">Phone *</label>
            <div class="relative">
              <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                bind:value={phone}
                placeholder="+1 234 567 890"
                class="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
              />
            </div>
          </div>

          {#if deliveryType === 'delivery'}
            <div>
              <label class="text-xs text-neutral-500 mb-1 block">Delivery Address *</label>
              <textarea
                bind:value={address}
                placeholder="123 Main St, Apt 4B"
                rows={2}
                class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none"
              ></textarea>
            </div>
          {:else}
            <div>
              <label class="text-xs text-neutral-500 mb-1 block">Table Number</label>
              <input
                bind:value={tableNumber}
                placeholder="e.g., 12"
                class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
              />
            </div>
          {/if}
        </div>
      </div>

      <!-- Delivery Time -->
      <div class="bg-white rounded-xl border p-4">
        <label class="text-sm font-medium mb-3 block">Delivery Time</label>
        <select
          bind:value={deliveryTime}
          class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
        >
          <option value="asap">As soon as possible</option>
          <option value="30">In 30 minutes</option>
          <option value="60">In 1 hour</option>
          <option value="90">In 1.5 hours</option>
          <option value="120">In 2 hours</option>
        </select>
      </div>

      <!-- Payment Method -->
      <div class="bg-white rounded-xl border p-4">
        <label class="text-sm font-medium mb-3 block">Payment Method</label>
        {#if paymentProviders.length === 0}
          <p class="text-sm text-neutral-500">Loading payment options...</p>
        {:else}
          <div class="space-y-2">
            {#each paymentProviders as p}
              <button
                class="w-full flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors {paymentMethod === p.provider ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-neutral-200 hover:border-orange-300'}"
                onclick={() => paymentMethod = p.provider}
              >
                {#if p.provider === 'cod'}
                  <Banknote class="w-4 h-4" />
                {:else if p.provider === 'stripe'}
                  <CreditCard class="w-4 h-4" />
                {:else}
                  <CreditCard class="w-4 h-4" />
                {/if}
                {p.provider === 'cod' ? 'Cash on Delivery' : p.provider === 'stripe' ? 'Credit / Debit Card (Stripe)' : p.provider}
              </button>
            {/each}
          </div>
        {/if}

        {#if paymentMethod === 'stripe'}
          <div class="mt-4 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
            {#if stripeLoading}
              <p class="text-sm text-neutral-500">Loading card form...</p>
            {:else}
              <label class="text-xs text-neutral-500 mb-1 block">Card Details</label>
              <div id="card-element" class="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white"></div>
            {/if}
            {#if stripeError}
              <p class="text-sm text-red-500 mt-2">{stripeError}</p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Order Summary -->
      <div class="bg-white rounded-xl border p-4 space-y-2">
        <h2 class="font-semibold mb-2">Order Summary</h2>
        {#each cartItems as item}
          <div class="flex justify-between text-sm">
            <span>{item.qty}x {item.title}</span>
            <span>${(Number(item.price) * item.qty).toFixed(2)}</span>
          </div>
        {/each}
        <div class="flex justify-between text-sm pt-2 border-t">
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
        onclick={placeOrder}
        class="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 active:scale-95 transition-all"
      >
        Place Order - ${total.toFixed(2)}
      </button>
    </div>
  {/if}
</div>
