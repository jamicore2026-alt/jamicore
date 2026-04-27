<script lang="ts">
  import type { PageData } from './$types.js';
  import type { ShippingOption } from '@repo/shared-types';
  import AddressForm from '$lib/components/checkout/AddressForm.svelte';
  import ShippingRateSelector from '$lib/components/checkout/ShippingRateSelector.svelte';
  import OrderSummarySidebar from '$lib/components/checkout/OrderSummarySidebar.svelte';
  import CheckoutStepper from '$lib/components/checkout/CheckoutStepper.svelte';
  import { goto } from '$app/navigation';
  import { getCookie } from '$lib/api/client.js';

  let { data }: { data: PageData } = $props();

  let shippingOptions = $state<ShippingOption[]>([]);
  let selectedShippingRateId = $state('');
  let addressSubmitted = $state(false);
  let loadingRates = $state(false);
  let selectedAddress = $state('');
  let customAddress = $state(false);

  const steps = [
    { label: 'Shipping', href: '/checkout/shipping' },
    { label: 'Payment', href: '/checkout/payment' },
    { label: 'Confirm', href: '/checkout/confirm' },
  ];

  async function handleAddressSubmit(address: any) {
    loadingRates = true;
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch('/api/v1/public/shipping/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          country: address.country,
          state: address.state,
          postalCode: address.postalCode,
          subtotal: data.cart?.subtotal ?? '0',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        shippingOptions = result.options ?? [];
        addressSubmitted = true;
      }
    } catch {
      // shipping calc failed
    } finally {
      loadingRates = false;
    }
  }

  function proceedToPayment() {
    // Store checkout state in sessionStorage for multi-step flow
    const checkoutState = {
      shippingRateId: selectedShippingRateId,
      addressType: customAddress ? 'custom' : 'saved',
      savedAddressId: selectedAddress,
    };
    sessionStorage.setItem('checkout_shipping', JSON.stringify(checkoutState));
    goto('/checkout/payment');
  }
</script>

<svelte:head>
  <title>Shipping | Checkout</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <CheckoutStepper {steps} currentStep={0} />

<div class="lg:grid lg:grid-cols-5 lg:gap-8">
  <div class="lg:col-span-3">
    <h1 class="text-xl font-bold text-[var(--color-text)] mb-6">Shipping Address</h1>

    <!-- Saved addresses -->
    {#if data.addresses.length > 0 && !customAddress}
      <div class="space-y-2 mb-4">
        {#each data.addresses as addr (addr.id)}
          <button
            class="w-full text-left px-4 py-3 rounded-[var(--radius-md)] border transition-all {selectedAddress === addr.id
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}"
            onclick={() => (selectedAddress = addr.id)}
          >
            <p class="text-sm font-medium text-[var(--color-text)]">{addr.firstName} {addr.lastName}</p>
            <p class="text-xs text-[var(--color-text-secondary)]">{addr.addressLine1}, {addr.city}, {addr.country} {addr.postalCode}</p>
            {#if addr.isDefault}
              <span class="text-xs text-[var(--color-primary)] font-medium">Default</span>
            {/if}
          </button>
        {/each}
        <button
          class="text-sm text-[var(--color-primary)] hover:underline"
          onclick={() => (customAddress = true)}
        >
          + Use a different address
        </button>
      </div>

      {#if selectedAddress && !addressSubmitted}
        <button
          class="px-6 py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] font-medium hover:opacity-90"
          onclick={() => {
            const addr = data.addresses.find(a => a.id === selectedAddress);
            if (addr) handleAddressSubmit(addr);
          }}
          disabled={loadingRates}
        >
          {loadingRates ? 'Calculating...' : 'Get Shipping Rates'}
        </button>
      {/if}
    {/if}

    <!-- Address form (for guests or "use different address") -->
    {#if data.addresses.length === 0 || customAddress}
      <AddressForm onSubmit={handleAddressSubmit} loading={loadingRates} />
    {/if}

    <!-- Shipping rates -->
    {#if addressSubmitted}
      <div class="mt-8">
        <h2 class="text-lg font-semibold text-[var(--color-text)] mb-4">Shipping Method</h2>
        <ShippingRateSelector
          options={shippingOptions}
          selectedId={selectedShippingRateId}
          onSelect={(id) => (selectedShippingRateId = id)}
        />
        {#if selectedShippingRateId}
          <button
            class="mt-4 px-6 py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] font-medium hover:opacity-90"
            onclick={proceedToPayment}
          >
            Continue to Payment
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Order summary -->
  <div class="mt-8 lg:mt-0 lg:col-span-2">
    <div class="sticky top-24">
      <OrderSummarySidebar
        items={data.cart?.items ?? []}
        subtotal={data.cart?.subtotal ?? '0'}
        total={data.cart?.total ?? '0'}
      />
    </div>
  </div>
</div>
</div>