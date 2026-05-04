<script lang="ts">
  import { Truck, RotateCcw, Shield, Clock } from '@lucide/svelte';

  const trustItems = [
    {
      icon: Truck,
      label: 'Free Shipping',
      description: 'On orders over $50',
    },
    {
      icon: RotateCcw,
      label: 'Easy Returns',
      description: '30-day return policy',
    },
    {
      icon: Shield,
      label: 'Secure Payment',
      description: 'SSL encrypted checkout',
    },
    {
      icon: Clock,
      label: '24/7 Support',
      description: 'Always here to help',
    },
  ];
</script>

<section class="py-10 px-4 sm:px-6 lg:px-8 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
  <div class="max-w-7xl mx-auto">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
      {#each trustItems as item}
        <div class="flex flex-col items-center text-center gap-3 py-4">
          <div class="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <item.icon class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm sm:text-base font-semibold text-[var(--color-text)]">
              {item.label}
            </p>
            <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
              {item.description}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>