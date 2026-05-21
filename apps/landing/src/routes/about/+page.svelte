<script lang="ts">
  import { Target, Code2, Users, Globe } from '@lucide/svelte';

  const values = [
    {
      icon: Target,
      title: 'Mission',
      description:
        'To democratize e-commerce by giving every merchant — from solo founders to enterprise teams — the tools to build, launch, and scale online stores without friction.',
    },
    {
      icon: Code2,
      title: 'Technology',
      description:
        'Built on modern foundations: Fastify v5, Drizzle ORM, PostgreSQL 17, Redis, and SvelteKit. Type-safe, fast, and designed for the edge.',
    },
    {
      icon: Users,
      title: 'Community First',
      description:
        'We believe in open collaboration. Our roadmap is shaped by real merchant feedback, not boardroom guesses.',
    },
    {
      icon: Globe,
      title: 'Global Ready',
      description:
        'Multi-currency, multi-language, and multi-region support out of the box. Sell anywhere your customers are.',
    },
  ];

  const stats = [
    { label: 'Stores Launched', value: '1,200+' },
    { label: 'Products Managed', value: '45K+' },
    { label: 'Orders Processed', value: '89K+' },
    { label: 'Uptime', value: '99.9%' },
  ];
</script>

<svelte:head>
  <title>About — jamicore</title>
  <meta name="description" content="jamicore is a headless multi-tenant e-commerce platform built for modern merchants. Learn about our mission, technology, and values." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">About jamicore</h1>
    <p class="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
      A headless multi-tenant e-commerce platform designed for merchants who demand speed,
      flexibility, and control.
    </p>
  </div>

  <!-- Story -->
  <div class="mt-20 grid gap-12 lg:grid-cols-2 lg:items-center">
    <div>
      <h2 class="text-3xl font-bold text-foreground">Why We Built jamicore</h2>
      <div class="mt-6 space-y-4 text-muted-foreground">
        <p>
          Most e-commerce platforms force you into rigid templates, lock you into expensive
          ecosystems, or charge enterprise rates for basic features. We built jamicore because
          merchants deserve better.
        </p>
        <p>
          jamicore is a headless, multi-tenant platform that separates your storefront from
          your backend. This means you get complete control over the customer experience while
          we handle the heavy lifting — inventory, orders, payments, and analytics.
        </p>
        <p>
          Whether you run a single boutique or a network of stores across regions, jamicore
          scales with you. One dashboard. Multiple storefronts. Zero compromise.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      {#each stats as stat}
        <div class="rounded-xl border border-border bg-card p-6 text-center">
          <div class="text-3xl font-bold text-accent">{stat.value}</div>
          <div class="mt-1 text-sm text-muted-foreground">{stat.label}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Values -->
  <div class="mt-28">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-foreground">Our Values</h2>
      <p class="mx-auto mt-4 max-w-2xl text-muted-foreground">
        The principles that guide every decision we make.
      </p>
    </div>

    <div class="mt-16 grid gap-8 sm:grid-cols-2">
      {#each values as value}
        <div class="rounded-xl border border-border bg-card p-8">
          <div class="inline-flex rounded-lg bg-accent/10 p-3">
            <value.icon class="h-6 w-6 text-accent" />
          </div>
          <h3 class="mt-4 text-xl font-semibold text-foreground">{value.title}</h3>
          <p class="mt-2 text-muted-foreground">{value.description}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Tech Stack -->
  <div class="mt-28">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-foreground">Built on Modern Foundations</h2>
      <p class="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Every layer of jamicore is built with proven, production-ready technology.
      </p>
    </div>

    <div class="mx-auto mt-16 max-w-4xl">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each [
          { name: 'Fastify v5', role: 'API Framework' },
          { name: 'Drizzle ORM', role: 'Database' },
          { name: 'PostgreSQL 17', role: 'Datastore' },
          { name: 'Redis', role: 'Cache & Queue' },
          { name: 'SvelteKit', role: 'Frontend' },
          { name: 'Tailwind CSS', role: 'Styling' },
          { name: 'Zod', role: 'Validation' },
          { name: 'BullMQ', role: 'Job Queue' },
          { name: 'Docker', role: 'Deployment' },
        ] as tech}
          <div class="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <div class="h-2 w-2 rounded-full bg-accent"></div>
            <div>
              <div class="text-sm font-medium text-foreground">{tech.name}</div>
              <div class="text-xs text-muted-foreground">{tech.role}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="mt-28 text-center">
    <h2 class="text-3xl font-bold tracking-tight text-foreground">Ready to Build With Us?</h2>
    <p class="mx-auto mt-4 max-w-xl text-muted-foreground">
      Start your free account today and experience what modern e-commerce feels like.
    </p>
    <div class="mt-8">
      <a
        href="/register"
        class="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent/90"
      >
        Create Free Account
      </a>
    </div>
  </div>
</div>
