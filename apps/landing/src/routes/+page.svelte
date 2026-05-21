<script lang="ts">
  import {
    ShoppingCart,
    Palette,
    Shield,
    Zap,
    BarChart3,
    Headphones,
    ArrowRight,
    Check,
  } from '@lucide/svelte';

  const features = [
    {
      icon: ShoppingCart,
      title: 'Multi-Store Management',
      description: 'Run multiple storefronts from a single dashboard. Perfect for brands with diverse product lines.',
    },
    {
      icon: Palette,
      title: 'Custom Themes',
      description: 'Built-in theme system with customizable templates. Make your store look unique without coding.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'JWT-based auth, role-based access, CSRF protection, and audit logging built-in.',
    },
    {
      icon: Zap,
      title: 'Fast Performance',
      description: 'Edge-ready architecture with Redis caching, CDN support, and optimized database queries.',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track sales, customers, and inventory in real-time with beautiful dashboards.',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      description: 'Priority support with dedicated account managers for enterprise plans.',
    },
  ];

  const steps = [
    'Sign up in under 2 minutes',
    'Configure your store settings',
    'Add products and customize theme',
    'Go live with your own domain',
  ];
</script>

<svelte:head>
  <title>jamicore — Modern E-Commerce for Ambitious Merchants</title>
  <meta name="description" content="jamicore is a headless multi-tenant e-commerce platform built for modern merchants. Launch your store, manage products, process orders, and grow your business." />
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden border-b border-border">
  <div class="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
    <div class="text-center">
      <h1 class="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        E-Commerce That
        <span class="text-accent">Scales With You</span>
      </h1>
      <p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        jamicore is the headless multi-tenant platform built for modern merchants.
        Launch your store, manage products, process orders, and grow — all from one place.
      </p>
      <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <a
          href="/register"
          class="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Start Free Trial
          <ArrowRight class="h-4 w-4" />
        </a>
        <a
          href="/pricing"
          class="inline-flex items-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
        >
          View Pricing
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Features -->
<section class="py-20 lg:py-28">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything You Need</h2>
      <p class="mx-auto mt-4 max-w-2xl text-muted-foreground">
        A complete platform with all the tools to build, launch, and scale your online business.
      </p>
    </div>

    <div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as feature}
        <div class="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
          <div class="inline-flex rounded-lg bg-accent/10 p-3">
            <feature.icon class="h-6 w-6 text-accent" />
          </div>
          <h3 class="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
          <p class="mt-2 text-sm text-muted-foreground">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- How It Works -->
<section class="border-y border-border bg-card py-20 lg:py-28">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Launch in Minutes, Not Weeks</h2>
      <p class="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Get your store online with our streamlined setup process.
      </p>
    </div>

    <div class="mx-auto mt-16 max-w-3xl">
      <div class="space-y-6">
        {#each steps as step, i}
          <div class="flex items-start gap-4">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {i + 1}
            </div>
            <div class="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 flex-1">
              <Check class="h-5 w-5 text-success shrink-0" />
              <span class="text-foreground">{step}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="py-20 lg:py-28">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="rounded-2xl bg-accent px-6 py-16 text-center sm:px-12">
      <h2 class="text-3xl font-bold tracking-tight text-accent-foreground sm:text-4xl">Ready to Start Selling?</h2>
      <p class="mx-auto mt-4 max-w-xl text-accent-foreground/90">
        Join thousands of merchants using jamicore to power their online stores. No credit card required.
      </p>
      <div class="mt-8">
        <a
          href="/register"
          class="inline-flex items-center gap-2 rounded-md bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-background/90"
        >
          Create Free Account
          <ArrowRight class="h-4 w-4" />
        </a>
      </div>
    </div>
  </div>
</section>
