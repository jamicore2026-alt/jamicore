<script lang="ts">
  // LayoutData removed — unused in this layout
  import CheckoutStepper from '$lib/components/checkout/CheckoutStepper.svelte';

  let { children }: { children: any } = $props();

  const steps = [
    { label: 'Shipping', href: '/checkout/shipping' },
    { label: 'Payment', href: '/checkout/payment' },
    { label: 'Confirm', href: '/checkout/confirm' },
  ];
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <CheckoutStepper {steps} currentStep={0} />
  {@render children()}
</div>