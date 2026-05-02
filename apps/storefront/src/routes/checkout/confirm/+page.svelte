<script lang="ts">
  /* global Razorpay, Stripe */
  import type { PageData } from './$types.js';
  import CheckoutStepper from '$lib/components/checkout/CheckoutStepper.svelte';
  import OrderSummarySidebar from '$lib/components/checkout/OrderSummarySidebar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { formatPrice } from '$lib/utils/format.js';
  import { goto } from '$app/navigation';
  import { getCookie } from '$lib/api/client.js';

  let { data }: { data: PageData } = $props();

  const steps = [
    { label: 'Shipping', href: '/checkout/shipping' },
    { label: 'Payment', href: '/checkout/payment' },
    { label: 'Confirm', href: '/checkout/confirm' },
  ];

  let placing = $state(false);
  let error = $state('');
  // Retrieve checkout state from sessionStorage
  let shippingInfo = $state<any>({});
  let paymentInfo = $state<any>({});
  try {
    const rawShipping = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_shipping') : null;
    if (rawShipping) shippingInfo = JSON.parse(rawShipping);
    const rawPayment = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_payment') : null;
    if (rawPayment) paymentInfo = JSON.parse(rawPayment);
  } catch { /* ignore parse errors */ }

  let tax = $derived(paymentInfo.tax ?? '0');
  let couponDiscount = $derived(paymentInfo.couponDiscount ?? '0');
  let paymentMethod = $derived(paymentInfo.paymentMethod ?? 'cod');
  let effectiveTotal = $derived.by(() => {
    const subtotal = parseFloat(data.cart?.subtotal ?? '0');
    const taxNum = parseFloat(tax);
    const discount = parseFloat(couponDiscount);
    return (subtotal + taxNum - discount).toFixed(2);
  });

  const providerLabels: Record<string, string> = {
    razorpay: 'Razorpay',
    stripe: 'Stripe',
    cod: 'Cash on Delivery',
  };

  async function placeOrder() {
    placing = true;
    error = '';

    try {
      const cart = data.cart;
      if (!cart || !cart.items || cart.items.length === 0) {
        error = 'Cart is empty';
        return;
      }

      if (!paymentInfo.email) {
        alert('Email is required for checkout');
        return;
      }

      const body: any = {
        email: paymentInfo.email,
        currency: 'USD',
        items: cart.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          variantOptionIds: item.modifiers?.variantOptionIds || undefined,
          combinationKey: item.modifiers?.combinationKey || undefined,
          modifierOptionIds: item.modifiers?.modifierOptionIds || undefined,
        })),
        cartId: cart.id,
        paymentMethod: paymentMethod,
        couponCode: paymentInfo.couponCode || undefined,
        shippingRateId: shippingInfo.shippingRateId || undefined,
        notes: '',
      };

      // Add shipping address from saved or custom
      if (shippingInfo.addressType === 'saved' && shippingInfo.savedAddressId) {
        body.shippingFirstName = shippingInfo.firstName || '';
        body.shippingLastName = shippingInfo.lastName || '';
        body.shippingAddressLine1 = shippingInfo.line1 || '';
        body.shippingAddressLine2 = shippingInfo.line2 || '';
        body.shippingCity = shippingInfo.city || '';
        body.shippingState = shippingInfo.state || '';
        body.shippingCountry = shippingInfo.country || '';
        body.shippingPostalCode = shippingInfo.postalCode || '';
      } else if (shippingInfo.addressType === 'custom') {
        body.shippingFirstName = shippingInfo.firstName || '';
        body.shippingLastName = shippingInfo.lastName || '';
        body.shippingAddressLine1 = shippingInfo.line1 || '';
        body.shippingAddressLine2 = shippingInfo.line2 || '';
        body.shippingCity = shippingInfo.city || '';
        body.shippingState = shippingInfo.state || '';
        body.shippingCountry = shippingInfo.country || '';
        body.shippingPostalCode = shippingInfo.postalCode || '';
      }

      const idempotencyKey = sessionStorage.getItem('checkout_idempotency_key') || crypto.randomUUID();
      sessionStorage.setItem('checkout_idempotency_key', idempotencyKey);

      const csrfToken = getCookie('csrf_token');
      const res = await fetch('/api/v1/customer/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          'Idempotency-Key': idempotencyKey,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Order failed' }));
        error = err.message || 'Failed to place order';
        return;
      }

      const result = await res.json();
      const orderId = result.order?.id ?? '';

      // If COD, payment is done immediately — redirect
      if (paymentMethod === 'cod') {
        sessionStorage.removeItem('checkout_shipping');
        sessionStorage.removeItem('checkout_payment');
        goto(`/order-confirmed/${orderId}`);
        return;
      }

      // For Razorpay / Stripe, create a payment intent after order creation
      const intentRes = await fetch('/api/v1/customer/payments/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          provider: paymentMethod,
        }),
      });

      if (!intentRes.ok) {
        const err = await intentRes.json().catch(() => ({ message: 'Payment intent failed' }));
        error = err.message || 'Failed to initiate payment';
        return;
      }

      const intent = await intentRes.json();

      if (paymentMethod === 'razorpay' && intent.razorpayOrderId) {
        await openRazorpayCheckout(intent, orderId);
      } else if (paymentMethod === 'stripe' && intent.clientSecret) {
        await openStripeCheckout(intent, orderId);
      } else {
        // Fallback: order placed, redirect
        sessionStorage.removeItem('checkout_shipping');
        sessionStorage.removeItem('checkout_payment');
        goto(`/order-confirmed/${orderId}`);
      }
    } catch (e: any) {
      error = e.message || 'Something went wrong';
    } finally {
      placing = false;
    }
  }

  async function openRazorpayCheckout(intent: any, orderId: string) {
    // Load Razorpay checkout.js if not already loaded
    if (!document.getElementById('razorpay-checkout-js')) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
        document.body.appendChild(script);
      });
    }

    const options: any = {
      key: intent.razorpayKeyId,
      amount: intent.amount,
      currency: intent.currency,
      order_id: intent.razorpayOrderId,
      name: 'Store',
      description: `Order ${orderId.slice(0, 8)}`,
      handler: function (_response: any) {
        // Payment completed on Razorpay side — webhook will confirm
        // Redirect to order confirmed page
        sessionStorage.removeItem('checkout_shipping');
        sessionStorage.removeItem('checkout_payment');
        goto(`/order-confirmed/${orderId}`);
      },
      prefill: {
        email: paymentInfo.email || '',
        contact: paymentInfo.phone || '',
      },
      theme: {
        color: '#0ea5e9',
      },
    };

    // @ts-expect-error Razorpay global from checkout.js
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', () => {
      error = 'Payment failed. Please try again.';
    });
    rzp.open();
  }

  async function openStripeCheckout(intent: any, orderId: string) {
    // Load Stripe.js if not already loaded
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

    // @ts-expect-error Stripe global from stripe.js
    const stripe = Stripe(intent.publishableKey ?? '');

    const storedPaymentMethodId = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_payment_method_id') : null;
    const usePaymentRequest = typeof window !== 'undefined' && sessionStorage.getItem('checkout_use_payment_request') === 'true';

    if (usePaymentRequest && storedPaymentMethodId) {
      stripe.confirmCardPayment(intent.clientSecret, {
        payment_method: storedPaymentMethodId,
      }).then((result: any) => {
        if (result.error) {
          error = result.error.message || 'Payment failed';
        } else {
          sessionStorage.removeItem('checkout_shipping');
          sessionStorage.removeItem('checkout_payment');
          sessionStorage.removeItem('checkout_payment_method_id');
          sessionStorage.removeItem('checkout_use_payment_request');
          goto(`/order-confirmed/${orderId}`);
        }
      });
    } else {
      stripe.confirmCardPayment(intent.clientSecret, {
        return_url: `${window.location.origin}/order-confirmed/${orderId}`,
      }).then((result: any) => {
        if (result.error) {
          error = result.error.message || 'Payment failed';
        } else {
          sessionStorage.removeItem('checkout_shipping');
          sessionStorage.removeItem('checkout_payment');
          sessionStorage.removeItem('checkout_payment_method_id');
          sessionStorage.removeItem('checkout_use_payment_request');
          goto(`/order-confirmed/${orderId}`);
        }
      });
    }
  }
</script>

<svelte:head>
  <title>Confirm Order | Checkout</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <CheckoutStepper {steps} currentStep={2} />

<div class="lg:grid lg:grid-cols-5 lg:gap-8">
  <div class="lg:col-span-3 space-y-6">
    <h1 class="text-xl font-bold text-[var(--color-text)]">Review Your Order</h1>

    {#if error}
      <div class="bg-[var(--color-error)]/10 text-[var(--color-error)] p-4 rounded-[var(--radius-md)] text-sm">
        {error}
      </div>
    {/if}

    <!-- Cart items -->
    <div class="space-y-3">
      <h2 class="text-sm font-semibold text-[var(--color-text)]">Items ({data.cart?.itemCount ?? 0})</h2>
      {#each data.cart?.items ?? [] as item (item.id)}
        <div class="flex justify-between text-sm py-2 border-b border-[var(--color-border)]">
          <span class="text-[var(--color-text-secondary)]">{item.productId.slice(0,12)} x{item.quantity}</span>
          <span class="font-medium text-[var(--color-text)]">{formatPrice(item.total)}</span>
        </div>
      {/each}
    </div>

    <!-- Shipping summary -->
    <div class="text-sm text-[var(--color-text-secondary)]">
      <h2 class="font-semibold text-[var(--color-text)] mb-1">Shipping</h2>
      <p>Standard shipping (rates calculated in shipping step)</p>
    </div>

    <!-- Payment summary -->
    <div class="text-sm text-[var(--color-text-secondary)]">
      <h2 class="font-semibold text-[var(--color-text)] mb-1">Payment</h2>
      <p>{providerLabels[paymentMethod] ?? paymentMethod}</p>
      {#if paymentInfo.email}
        <p>Contact: {paymentInfo.email}</p>
      {/if}
      {#if paymentInfo.couponCode}
        <p>Coupon: {paymentInfo.couponCode}</p>
      {/if}
    </div>

    <Button
      size="lg"
      class="w-full"
      onclick={placeOrder}
      disabled={placing}
    >
      {placing ? 'Placing Order...' : 'Place Order'}
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