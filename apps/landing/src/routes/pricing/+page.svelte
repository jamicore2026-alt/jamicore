<script lang="ts">
  import { Check, X } from '@lucide/svelte';

  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: '/month',
      description: 'Perfect for trying out the platform.',
      features: [
        { text: '1 storefront', included: true },
        { text: 'Up to 50 products', included: true },
        { text: 'Basic analytics', included: true },
        { text: 'Community support', included: true },
        { text: 'Custom domain', included: false },
        { text: 'Priority support', included: false },
        { text: 'Advanced reports', included: false },
        { text: 'API access', included: false },
      ],
      cta: 'Get Started',
      href: '/register',
      highlighted: false,
    },
    {
      name: 'Growth',
      price: '$29',
      period: '/month',
      description: 'For merchants ready to scale.',
      features: [
        { text: '3 storefronts', included: true },
        { text: 'Unlimited products', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Email support', included: true },
        { text: 'Custom domain', included: true },
        { text: 'Priority support', included: false },
        { text: 'Advanced reports', included: true },
        { text: 'API access', included: false },
      ],
      cta: 'Start Free Trial',
      href: '/register',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: '/month',
      description: 'For large teams and high-volume stores.',
      features: [
        { text: 'Unlimited storefronts', included: true },
        { text: 'Unlimited products', included: true },
        { text: 'Real-time analytics', included: true },
        { text: '24/7 priority support', included: true },
        { text: 'Custom domain + SSL', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Advanced reports + exports', included: true },
        { text: 'Full API access', included: true },
      ],
      cta: 'Contact Sales',
      href: '/register',
      highlighted: false,
    },
  ];
</script>

<svelte:head>
  <title>Pricing — jamicore</title>
  <meta name="description" content="Simple, transparent pricing for every stage of your business. Start free, upgrade as you grow." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
  <div class="text-center">
    <h1 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Simple, Transparent Pricing</h1>
    <p class="mx-auto mt-4 max-w-2xl text-muted-foreground">
      Start free and upgrade as your business grows. No hidden fees, no surprises.
    </p>
  </div>

  <div class="mt-16 grid gap-8 lg:grid-cols-3">
    {#each plans as plan}
      <div
        class="flex flex-col rounded-2xl border p-8 {plan.highlighted
          ? 'border-accent bg-accent/5'
          : 'border-border bg-card'}"
      >
        <div>
          <h3 class="text-lg font-semibold text-foreground">{plan.name}</h3>
          <p class="mt-2 text-sm text-muted-foreground">{plan.description}</p>
          <div class="mt-6 flex items-baseline">
            <span class="text-4xl font-bold text-foreground">{plan.price}</span>
            <span class="ml-1 text-sm text-muted-foreground">{plan.period}</span>
          </div>
        </div>

        <ul class="mt-8 space-y-4 flex-1">
          {#each plan.features as feature}
            <li class="flex items-start gap-3">
              {#if feature.included}
                <Check class="mt-0.5 h-5 w-5 shrink-0 text-success" />
              {:else}
                <X class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              {/if}
              <span class="text-sm {feature.included ? 'text-foreground' : 'text-muted-foreground'}">{feature.text}</span>
            </li>
          {/each}
        </ul>

        <div class="mt-8">
          <a
            href={plan.href}
            class="block w-full rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors {plan.highlighted
              ? 'bg-accent text-accent-foreground hover:bg-accent/90'
              : 'border border-border bg-background text-foreground hover:bg-muted'}"
          >
            {plan.cta}
          </a>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-16 text-center">
    <p class="text-sm text-muted-foreground">
      All plans include SSL certificates, automatic backups, and 99.9% uptime SLA.
    </p>
  </div>
</div>
