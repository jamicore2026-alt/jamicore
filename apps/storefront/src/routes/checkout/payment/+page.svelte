<script lang="ts">
  import type { PageData } from './$types.js';
  import CheckoutStepper from '$lib/components/checkout/CheckoutStepper.svelte';
  import OrderSummarySidebar from '$lib/components/checkout/OrderSummarySidebar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { goto } from '$app/navigation';
  import { getCookie } from '$lib/api/client.js';

  let { data }: { data: PageData } = $props();

  const steps = [
    { label: 'Shipping', href: '/checkout/shipping' },
    { label: 'Payment', href: '/checkout/payment' },
    { label: 'Confirm', href: '/checkout/confirm' },
  ];

  let couponCode = $state('');
  let couponError = $state('');
  let couponDiscount = $state('0');
  let tax = $state('0');
  let calculatingTax = $state(false);
  let email = $state('');
  let phone = $state('');

  // Payment state
  let selectedProvider = $state('');
  let paymentLoading = $state(false);
  let paymentError = $state('');

  // Apple Pay / Google Pay state
  let showPaymentRequestButton = $state(false);
  let paymentRequestError = $state('');
  let stripeInitialized = $state(false);

  // Available providers from server data
  const enabledProviders = $derived(
    (data.paymentProviders ?? []).filter((p: any) => p.isEnabled)
  );

  // Auto-select first provider if only one available
  $effect(() => {
    if (enabledProviders.length === 1 && !selectedProvider) {
      selectedProvider = enabledProviders[0].provider;
    }
  });

  // Initialize Stripe Payment Request for Apple Pay / Google Pay
  $effect(() => {
    const stripeProvider = (enabledProviders as any[]).find((p: any) => p.provider === 'stripe' && p.publishableKey);
    if (stripeProvider?.publishableKey && !stripeInitialized && typeof window !== 'undefined') {
      stripeInitialized = true;
      initPaymentRequest(stripeProvider.publishableKey);
    }
  });

  // Retrieve shipping state
  let shippingState: any = {};
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_shipping') : null;
    if (raw) shippingState = JSON.parse(raw);
  } catch { /* ignore parse errors */ }

  // Calculate tax on mount
  $effect(() => {
    calculateTax();
  });

  async function calculateTax() {
    if (!data.cart) return;
    calculatingTax = true;
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch('/api/v1/public/tax/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          country: 'US',
          subtotal: data.cart.subtotal,
          shipping: '0',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        tax = String(result.totalTax ?? 0);
      }
    } catch {
      // tax calc failed
    } finally {
      calculatingTax = false;
    }
  }

  let effectiveTotal = $derived.by(() => {
    const subtotal = parseFloat(data.cart?.subtotal ?? '0');
    const taxNum = parseFloat(tax);
    const discount = parseFloat(couponDiscount);
    return (subtotal + taxNum - discount).toFixed(2);
  });

  async function applyCoupon() {
    couponError = '';
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch('/api/v1/customer/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          code: couponCode,
          orderAmount: data.cart?.subtotal ?? '0',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.valid && result.coupon) {
          const coupon = result.coupon;
          const subtotal = parseFloat(data.cart?.subtotal ?? '0');
          if (coupon.type === 'Percent') {
            couponDiscount = (subtotal * parseFloat(coupon.value) / 100).toFixed(2);
          } else {
            couponDiscount = coupon.value;
          }
        } else {
          couponError = 'Invalid coupon code';
        }
      } else {
        couponError = 'Invalid coupon code';
      }
    } catch {
      couponError = 'Failed to validate coupon';
    }
  }

  // ─── Payment method labels ───
  const providerLabels: Record<string, string> = {
    razorpay: 'Razorpay (Cards / UPI / Wallets)',
    stripe: 'Stripe (Cards / Apple Pay / Google Pay)',
    cod: 'Cash on Delivery',
  };

  // ─── Initialize Stripe Payment Request Button ───
  async function initPaymentRequest(publishableKey: string) {
    try {
      if (!document.getElementById('stripe-js')) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.id = 'stripe-js';
          script.src = 'https://js.stripe.com/v3/';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Stripe SDK'));
          document.body.appendChild(script);
        });
      }

      const stripe = window.Stripe(publishableKey);
      const paymentRequest = stripe.paymentRequest({
        country: 'US',
        currency: (((data.cart as any)?.currency) ?? 'USD').toLowerCase(),
        total: {
          label: 'Total',
          amount: Math.round(parseFloat(effectiveTotal) * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      const canMakePayment = await paymentRequest.canMakePayment();
      if (canMakePayment) {
        showPaymentRequestButton = true;

        const elements = stripe.elements();
        const prButton = elements.create('paymentRequestButton', {
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'default',
              theme: 'dark',
              height: '44px',
            },
          },
        });

        // Mount after the container renders
        setTimeout(() => {
          const container = document.getElementById('payment-request-button');
          if (container) {
            prButton.mount('#payment-request-button');
          }
        }, 0);

        paymentRequest.on('paymentmethod', async (ev: any) => {
          try {
            sessionStorage.setItem('checkout_payment_method_id', ev.paymentMethod.id);
            sessionStorage.setItem('checkout_use_payment_request', 'true');
            ev.complete('success');
            goto('/checkout/confirm');
          } catch (e: any) {
            ev.complete('fail');
            paymentRequestError = e.message || 'Payment failed';
          }
        });
      }
    } catch (e: any) {
      paymentRequestError = e.message || 'Failed to initialize payment request';
    }
  }

  // ─── Proceed to confirm with payment method stored ───
  function proceedToConfirm() {
    paymentError = '';
    if (!selectedProvider) {
      paymentError = 'Please select a payment method';
      return;
    }

    // Store payment method in sessionStorage for the confirm step
    const paymentState = {
      email,
      phone,
      couponCode: couponCode || undefined,
      couponDiscount,
      tax,
      paymentMethod: selectedProvider,
    };
    sessionStorage.setItem('checkout_payment', JSON.stringify(paymentState));
    goto('/checkout/confirm');
  }
</script>

<svelte:head>
  <title>Payment | Checkout</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <CheckoutStepper {steps} currentStep={1} />

<div class="lg:grid lg:grid-cols-5 lg:gap-8">
  <div class="lg:col-span-3 space-y-8">
    <!-- Contact info -->
    <div>
      <h2 class="text-lg font-semibold text-[var(--color-text)] mb-4">Contact Information</h2>
      <div class="space-y-4">
        <div>
          <Label for="email" class="text-sm font-medium">Email</Label>
          <Input id="email" type="email" bind:value={email} required class="mt-1" />
        </div>
        <div>
          <Label for="phone" class="text-sm font-medium">Phone (optional)</Label>
          <Input id="phone" type="tel" bind:value={phone} class="mt-1" />
        </div>
      </div>
    </div>

    <!-- Coupon code -->
    <div>
      <h2 class="text-lg font-semibold text-[var(--color-text)] mb-4">Coupon Code</h2>
      <div class="flex gap-2">
        <Input
          bind:value={couponCode}
          placeholder="Enter coupon code"
          class="flex-1"
          onkeydown={(e) => e.key === 'Enter' && applyCoupon()}
        />
        <Button variant="outline" onclick={applyCoupon} disabled={!couponCode}>Apply</Button>
      </div>
      {#if couponError}
        <p class="text-sm text-[var(--color-error)] mt-1">{couponError}</p>
      {/if}
      {#if parseFloat(couponDiscount) > 0}
        <p class="text-sm text-green-600 mt-1">Discount applied: -${couponDiscount}</p>
      {/if}
    </div>

    <!-- Payment method selection -->
    <div>
      <h2 class="text-lg font-semibold text-[var(--color-text)] mb-4">Payment Method</h2>

      {#if enabledProviders.length === 0}
        <div class="p-6 border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] text-center text-[var(--color-text-secondary)]">
          <p class="text-sm">No payment methods available for this store.</p>
          <p class="text-xs mt-1">Please contact the store owner.</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each enabledProviders as p (p.provider)}
            <label
              class="flex items-center gap-3 p-4 border rounded-[var(--radius-md)] cursor-pointer transition-colors
                {selectedProvider === p.provider
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}"
            >
              <input
                type="radio"
                name="paymentProvider"
                value={p.provider}
                bind:group={selectedProvider}
                class="accent-[var(--color-primary)]"
              />
              <span class="text-sm font-medium text-[var(--color-text)]">
                {providerLabels[p.provider] ?? p.provider}
              </span>
            </label>
          {/each}
        </div>
      {/if}

      {#if showPaymentRequestButton}
        <div class="mt-4">
          <div id="payment-request-button"></div>
          {#if paymentRequestError}
            <p class="text-sm text-[var(--color-error)] mt-2">{paymentRequestError}</p>
          {/if}
        </div>
      {/if}

      {#if paymentError}
        <p class="text-sm text-[var(--color-error)] mt-2">{paymentError}</p>
      {/if}
    </div>

    <Button
      onclick={proceedToConfirm}
      size="lg"
      class="w-full"
      disabled={!selectedProvider}
    >
      Review Order
    </Button>
  </div>

  <!-- Order summary -->
  <div class="mt-8 lg:mt-0 lg:col-span-2">
    <div class="sticky top-24">
      <OrderSummarySidebar
        items={data.cart?.items ?? []}
        subtotal={data.cart?.subtotal ?? '0'}
        tax={tax}
        discount={couponDiscount}
        total={effectiveTotal}
      />
    </div>
  </div>
</div>
</div>