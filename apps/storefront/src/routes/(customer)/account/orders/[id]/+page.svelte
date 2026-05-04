<script lang="ts">
  import type { PageData } from './$types.js';
  import { formatPrice } from '$lib/utils/format.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { ArrowLeft } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
  const order = $derived(data.order);

  const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];
  const currentStep = $derived(statusSteps.indexOf(order.status));
  const isCancelled = $derived(order.status === 'cancelled');
</script>

<svelte:head>
  <title>Order #{order.orderNumber} | My Account</title>
</svelte:head>

<div>
  <a href="/account/orders" class="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] mb-4">
    <ArrowLeft class="size-4" />
    Back to Orders
  </a>

  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-[var(--color-text)]">Order #{order.orderNumber}</h1>
      <p class="text-sm text-[var(--color-text-secondary)]">
        Placed on {new Date(order.createdAt).toLocaleDateString()}
      </p>
    </div>
    <Badge class={isCancelled
      ? 'bg-red-100 text-red-700'
      : 'bg-blue-100 text-blue-700'}>
      {order.status}
    </Badge>
  </div>

  <!-- Status timeline -->
  {#if !isCancelled}
    <div class="flex items-center mb-8">
      {#each statusSteps as step, i}
        <div class="flex items-center flex-1">
          <div class="flex flex-col items-center flex-1">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 {i <= currentStep
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}"
            >
              {#if i < currentStep}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              {:else}
                {i + 1}
              {/if}
            </div>
            <span class="text-xs mt-1 capitalize {i <= currentStep ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-secondary)]'}">
              {step}
            </span>
          </div>
          {#if i < statusSteps.length - 1}
            <div class="h-0.5 flex-1 {i < currentStep ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}"></div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="grid lg:grid-cols-3 gap-8">
    <!-- Order items -->
    <div class="lg:col-span-2">
      <h2 class="text-lg font-semibold text-[var(--color-text)] mb-4">Items</h2>
      <div class="border border-[var(--color-border)] rounded-[var(--radius-md)] divide-y divide-[var(--color-border)]">
        {#each order.items ?? [] as item}
          <div class="p-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-[var(--color-text)]">{item.productName}</p>
              {#if item.variantInfo}
                <p class="text-xs text-[var(--color-text-secondary)]">{item.variantInfo}</p>
              {/if}
              <p class="text-xs text-[var(--color-text-secondary)]">Qty: {item.quantity}</p>
            </div>
            <span class="text-sm font-semibold text-[var(--color-text)]">{formatPrice(item.total)}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Order summary sidebar -->
    <div class="space-y-6">
      <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
        <h3 class="font-semibold text-[var(--color-text)] mb-3">Order Total</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-[var(--color-text-secondary)]">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {#if parseFloat(order.shipping) > 0}
            <div class="flex justify-between">
              <span class="text-[var(--color-text-secondary)]">Shipping</span>
              <span>{formatPrice(order.shipping)}</span>
            </div>
          {/if}
          {#if parseFloat(order.tax) > 0}
            <div class="flex justify-between">
              <span class="text-[var(--color-text-secondary)]">Tax</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
          {/if}
          {#if parseFloat(order.discount) > 0}
            <div class="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          {/if}
          <div class="border-t border-[var(--color-border)] pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span class="text-[var(--color-primary)]">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <!-- Shipping address -->
      {#if order.shippingAddressLine1}
        <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-2">Shipping Address</h3>
          <p class="text-sm text-[var(--color-text-secondary)]">
            {order.shippingFirstName} {order.shippingLastName}<br/>
            {order.shippingAddressLine1}<br/>
            {#if order.shippingAddressLine2}{order.shippingAddressLine2}<br/>{/if}
            {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}<br/>
            {order.shippingCountry}
          </p>
        </div>
      {/if}

      <!-- Tracking -->
      {#if order.trackingNumber}
        <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-2">Tracking</h3>
          <p class="text-sm text-[var(--color-text-secondary)]">{order.trackingNumber}</p>
          {#if order.shippingCarrier}
            <p class="text-xs text-[var(--color-text-secondary)]">via {order.shippingCarrier}</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>