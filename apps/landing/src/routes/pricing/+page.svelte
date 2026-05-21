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
    <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Pricing</p>
    <h1 class="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
      Simple,
      <span class="font-serif italic">transparent</span>
      pricing
    </h1>
    <p class="mt-4 text-lg text-gray-500">
      Start free and upgrade as your business grows. No hidden fees, no surprises.
    </p>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    {#each plans as plan}
      <div
        class="relative flex flex-col overflow-hidden rounded-xl border p-8 transition-all duration-300 {plan.highlighted
          ? 'border-emerald/30 bg-emerald/5 shadow-lg shadow-emerald/10'
          : 'border-gray-100 bg-white shadow-sm'}"
      >
        {#if plan.highlighted}
          <div class="absolute right-0 top-0 bg-emerald px-3 py-1 text-xs font-semibold text-white">
            Most Popular
          </div>
        {/if}

        <div>
          <h3 class="text-lg font-semibold text-navy">{plan.name}</h3>
          <p class="mt-1 text-sm text-gray-500">{plan.description}</p>

          <div class="mt-6 flex items-baseline gap-1">
            <span class="text-4xl font-bold tracking-tight text-navy">{plan.price}</span>
            <span class="text-sm text-gray-500">{plan.period}</span>
          </div>
        </div>

        <ul class="mt-8 flex-1 space-y-3">
          {#each plan.features as feature}
            <li class="flex items-start gap-3">
              {#if feature.included}
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald/10">
                  <Check class="h-3 w-3 text-emerald" />
                </div>
              {:else}
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Minus class="h-3 w-3 text-gray-400" />
                </div>
              {/if}
              <span class="text-sm {feature.included ? 'text-navy' : 'text-gray-400'}"
              >{feature.text}</span>
            </li>
          {/each}
        </ul>

        <div class="relative mt-8">
          <a
            href={plan.href}
            class="block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all {plan.highlighted
              ? 'bg-emerald text-white shadow-sm shadow-emerald/20 hover:bg-emerald-dark'
              : 'border border-gray-200 text-navy hover:border-emerald/30 hover:bg-emerald/5'}"
          >
            {plan.cta}
          </a>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-12 text-center">
    <p class="text-xs text-gray-400">
      All plans include SSL certificates, automatic backups, and a 99.9% uptime SLA.
    </p>
  </div>
</div>
