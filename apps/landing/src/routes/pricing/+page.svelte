<script lang="ts">
  import { Check, Minus } from '@lucide/svelte';

  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: '/month',
      description: 'Perfect for trying the platform.',
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
      description: 'For large teams and high volume.',
      features: [
        { text: 'Unlimited storefronts', included: true },
        { text: 'Unlimited products', included: true },
        { text: 'Real-time analytics', included: true },
        { text: '24/7 priority support', included: true },
        { text: 'Custom domain + SSL', included: true },
        { text: 'Dedicated manager', included: true },
        { text: 'Advanced reports', included: true },
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
  <meta
    name="description"
    content="Simple, transparent pricing for every stage of your business. Start free, upgrade as you grow."
  />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-16 max-w-2xl">
    <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">Pricing</p>
    <h1 class="font-serif text-5xl font-light text-foreground">
      Simple,
      <span class="font-semibold italic">transparent</span>
      pricing
    </h1>
    <p class="mt-4 text-muted-foreground">
      Start free and upgrade as your business grows. No hidden fees, no surprises.
    </p>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    {#each plans as plan}
      <div
        class="relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-all duration-500 {plan.highlighted
          ? 'border-accent/30 bg-accent/5'
          : 'border-border/30 bg-card/40'}"
      >
        {#if plan.highlighted}
          <div
            class="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl"
            style="background: #d97706;"
          ></div>
        {/if}

        <div class="relative">
          <h3 class="text-lg font-medium text-foreground">{plan.name}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{plan.description}</p>

          <div class="mt-6 flex items-baseline gap-1">
            <span class="font-serif text-5xl font-light text-foreground">{plan.price}</span>
            <span class="text-sm text-muted-foreground">{plan.period}</span>
          </div>
        </div>

        <ul class="mt-8 flex-1 space-y-3">
          {#each plan.features as feature}
            <li class="flex items-start gap-3">
              {#if feature.included}
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                  <Check class="h-3 w-3 text-success" />
                </div>
              {:else}
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Minus class="h-3 w-3 text-muted-foreground" />
                </div>
              {/if}
              <span class="text-sm {feature.included ? 'text-foreground' : 'text-muted-foreground'}">{feature.text}</span>
            </li>
          {/each}
        </ul>

        <div class="relative mt-8">
          <a
            href={plan.href}
            class="block w-full rounded-xl px-4 py-3 text-center text-sm font-medium transition-all {plan.highlighted
              ? 'bg-accent text-primary-foreground hover:shadow-lg hover:shadow-accent/20'
              : 'border border-border/50 text-foreground hover:border-accent/30 hover:bg-accent/5'}"
          >
            {plan.cta}
          </a>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-12 text-center">
    <p class="text-xs text-muted-foreground">
      All plans include SSL certificates, automatic backups, and a 99.9% uptime SLA.
    </p>
  </div>
</div>
