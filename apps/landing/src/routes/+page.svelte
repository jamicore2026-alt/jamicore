<script lang="ts">
  import {
    ShoppingCart,
    Palette,
    Shield,
    Zap,
    BarChart3,
    Headphones,
    ArrowRight,
    Sparkles,
    ChevronRight,
  } from '@lucide/svelte';

  const features = [
    {
      icon: ShoppingCart,
      title: 'Multi-Store',
      subtitle: 'Management',
      description:
        'Run multiple storefronts from a single dashboard. Perfect for brands with diverse product lines and regional variations.',
    },
    {
      icon: Palette,
      title: 'Custom',
      subtitle: 'Themes',
      description:
        'Built-in theme system with customizable templates. Make your store look unique without writing a single line of code.',
    },
    {
      icon: Shield,
      title: 'Enterprise',
      subtitle: 'Security',
      description:
        'JWT-based auth, role-based access control, CSRF protection, and comprehensive audit logging built-in from day one.',
    },
    {
      icon: Zap,
      title: 'Blazing',
      subtitle: 'Performance',
      description:
        'Edge-ready architecture with Redis caching, CDN support, and database queries optimized for sub-100ms response times.',
    },
    {
      icon: BarChart3,
      title: 'Real-Time',
      subtitle: 'Analytics',
      description:
        'Track sales, customers, and inventory in real-time. Beautiful dashboards that turn raw data into actionable insights.',
    },
    {
      icon: Headphones,
      title: 'Dedicated',
      subtitle: 'Support',
      description:
        'Priority support with dedicated account managers for enterprise plans. We succeed when you succeed.',
    },
  ];

  const steps = [
    { num: '01', title: 'Create Account', desc: 'Sign up in under two minutes with just your email and store name.' },
    { num: '02', title: 'Configure Store', desc: 'Set your domain, currency, shipping rules, and payment methods.' },
    { num: '03', title: 'Add Products', desc: 'Import catalogs or add products manually. Rich variants and modifiers supported.' },
    { num: '04', title: 'Go Live', desc: 'Connect your custom domain and start accepting orders from day one.' },
  ];
</script>

<svelte:head>
  <title>jamicore — E-Commerce That Scales With You</title>
  <meta
    name="description"
    content="A headless multi-tenant e-commerce platform built for modern merchants. Launch your store, manage products, process orders, and grow."
  />
</svelte:head>

<!-- Hero -->
<section class="relative flex min-h-screen items-center overflow-hidden pt-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="grid items-center gap-12 lg:grid-cols-12">
      <!-- Left content -->
      <div class="lg:col-span-7">
        <div
          class="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-medium text-accent"
        >
          <Sparkles class="h-3.5 w-3.5" />
          Now with AI-powered inventory forecasting
        </div>

        <h1 class="font-serif text-5xl font-light leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          E-Commerce
          <br />
          <span class="font-semibold italic text-accent">That Scales</span>
          <br />
          With You
        </h1>

        <p class="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          The headless multi-tenant platform built for merchants who refuse to compromise.
          One backend. Unlimited storefronts. Complete control.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="/register"
            class="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent/20 transition-all hover:shadow-accent/40"
          >
            Start Free Trial
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="/pricing"
            class="inline-flex items-center gap-1 rounded-full border border-border/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-accent/5"
          >
            View Pricing
            <ChevronRight class="h-4 w-4" />
          </a>
        </div>

        <div class="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-success"></span>
            99.9% Uptime SLA
          </div>
          <div class="h-4 w-px bg-border"></div>
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-success"></span>
            SOC 2 Compliant
          </div>
          <div class="h-4 w-px bg-border"></div>
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-success"></span>
            GDPR Ready
          </div>
        </div>
      </div>

      <!-- Right visual -->
      <div class="relative hidden lg:col-span-5 lg:block">
        <div
          class="relative aspect-square rounded-2xl border border-border/30 bg-card/50 p-8 backdrop-blur-sm"
        >
          <!-- Decorative rings -->
          <div
            class="absolute inset-4 rounded-xl border border-accent/10"
          ></div>
          <div
            class="absolute inset-8 rounded-lg border border-accent/5"
          ></div>

          <div class="relative flex h-full flex-col items-center justify-center text-center">
            <div
              class="mb-6 inline-flex rounded-2xl bg-accent/10 p-5"
            >
              <ShoppingCart class="h-12 w-12 text-accent" stroke-width={1.5} />
            </div>
            <div class="font-serif text-6xl font-light text-foreground">1,200+</div>
            <div class="mt-2 text-sm uppercase tracking-widest text-muted-foreground">
              Stores Launched
            </div>

            <div class="mt-8 grid grid-cols-2 gap-6 text-left">
              <div>
                <div class="font-serif text-2xl font-light text-foreground">45K+</div>
                <div class="text-xs text-muted-foreground">Products</div>
              </div>
              <div>
                <div class="font-serif text-2xl font-light text-foreground">89K+</div>
                <div class="text-xs text-muted-foreground">Orders</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Floating accent orb -->
        <div
          class="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl"
          style="background: radial-gradient(circle, #d97706, transparent);"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- Features -->
<section class="relative py-24 lg:py-32">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">Capabilities</p>
      <h2 class="font-serif text-4xl font-light text-foreground sm:text-5xl">
        Everything you need to
        <span class="font-semibold italic">sell smarter</span>
      </h2>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as feature}
        <div
          class="group relative overflow-hidden rounded-2xl border border-border/30 bg-card/40 p-8 backdrop-blur-sm transition-all duration-500 hover:border-accent/20 hover:bg-card/60"
        >
          <div
            class="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-20"
            style="background: #d97706;"
          ></div>

          <div class="relative">
            <div class="mb-5 inline-flex rounded-xl bg-accent/10 p-3 transition-colors group-hover:bg-accent/20">
              <feature.icon class="h-6 w-6 text-accent" stroke-width={1.5} />
            </div>

            <h3 class="text-lg font-medium text-foreground">
              {feature.title}
              <span class="block font-serif text-xl font-semibold italic text-accent"
>{feature.subtitle}</span>
            </h3>

            <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- How It Works -->
<section class="relative border-y border-border/20 py-24 lg:py-32">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">Process</p>
      <h2 class="font-serif text-4xl font-light text-foreground sm:text-5xl">
        From zero to
        <span class="font-semibold italic">live</span>
        in minutes
      </h2>
    </div>

    <div class="grid gap-8 lg:grid-cols-4">
      {#each steps as step, i}
        <div class="relative">
          {#if i < 3}
            <div class="absolute left-8 top-16 hidden h-px w-full bg-gradient-to-r from-border to-transparent lg:block"></div>
          {/if}

          <div class="relative">
            <div
              class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/30 bg-card/40 text-xl font-light text-accent backdrop-blur-sm"
            >
              {step.num}
            </div>

            <h3 class="text-lg font-medium text-foreground">{step.title}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="relative py-24 lg:py-32">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div
      class="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent px-8 py-20 text-center sm:px-16"
    >
      <!-- Background noise texture effect via CSS -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={`background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");`}
      ></div>

      <div class="relative">
        <h2 class="font-serif text-4xl font-light text-foreground sm:text-5xl">
          Ready to
          <span class="font-semibold italic text-accent">start selling?</span>
        </h2>

        <p class="mx-auto mt-4 max-w-lg text-muted-foreground">
          Join the merchants using jamicore to power their online stores. No credit
          card required to get started.
        </p>

        <div class="mt-8">
          <a
            href="/register"
            class="group inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent/20 transition-all hover:shadow-accent/40"
          >
            Create Free Account
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
