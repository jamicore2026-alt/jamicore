<script lang="ts">
  import { Target, Code2, Users, Globe } from '@lucide/svelte';

  const values = [
    {
      icon: Target,
      title: 'Mission',
      description:
        'Democratize e-commerce by giving every merchant — from solo founders to enterprise teams — the tools to build, launch, and scale online stores without friction.',
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
        'Our roadmap is shaped by real merchant feedback, not boardroom guesses. We build in public and iterate with our users.',
    },
    {
      icon: Globe,
      title: 'Global Ready',
      description:
        'Multi-currency, multi-language, and multi-region support out of the box. Sell anywhere your customers are, without extra configuration.',
    },
  ];

  const stats = [
    { label: 'Stores', value: '1,200+' },
    { label: 'Products', value: '45K+' },
    { label: 'Orders', value: '89K+' },
    { label: 'Uptime', value: '99.9%' },
  ];
</script>

<svelte:head>
  <title>About — jamicore</title>
  <meta
    name="description"
    content="jamicore is a headless multi-tenant e-commerce platform built for modern merchants. Learn about our mission, technology, and values."
  />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <!-- Header -->
  <div class="mb-20 max-w-3xl">
    <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">About</p>
    <h1 class="font-serif text-5xl font-light leading-[1.1] text-foreground">
      Built for merchants who refuse to
      <span class="font-semibold italic text-accent">compromise</span>
    </h1>
  </div>

  <!-- Story -->
  <div class="grid gap-16 lg:grid-cols-2 lg:items-center">
    <div class="space-y-5 text-muted-foreground">
      <p class="text-lg leading-relaxed text-foreground">
        Most e-commerce platforms force you into rigid templates, lock you into expensive ecosystems, or charge enterprise rates for basic features.
      </p>
      <p>
        We built jamicore because merchants deserve better. A headless, multi-tenant platform that separates your storefront from your backend — giving you complete control over the customer experience while we handle the heavy lifting.
      </p>
      <p>
        Whether you run a single boutique or a network of stores across regions, jamicore scales with you. One dashboard. Multiple storefronts. Zero compromise.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      {#each stats as stat}
        <div class="rounded-2xl border border-border/30 bg-card/40 p-6 backdrop-blur-sm">
          <div class="font-serif text-4xl font-light text-accent">{stat.value}</div>
          <div class="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Values -->
  <div class="mt-32">
    <div class="mb-12 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">Principles</p>
      <h2 class="font-serif text-4xl font-light text-foreground">What drives us</h2>
    </div>

    <div class="grid gap-6 sm:grid-cols-2">
      {#each values as value}
        <div class="rounded-2xl border border-border/30 bg-card/40 p-8 backdrop-blur-sm">
          <div class="mb-5 inline-flex rounded-xl bg-accent/10 p-3">
            <value.icon class="h-5 w-5 text-accent" stroke-width={1.5} />
          </div>
          <h3 class="text-lg font-medium text-foreground">{value.title}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Tech Stack -->
  <div class="mt-32">
    <div class="mb-12 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">Stack</p>
      <h2 class="font-serif text-4xl font-light text-foreground">Modern foundations</h2>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each [
        { name: 'Fastify v5', role: 'API Framework' },
        { name: 'Drizzle ORM', role: 'Database Layer' },
        { name: 'PostgreSQL 17', role: 'Datastore' },
        { name: 'Redis', role: 'Cache & Queue' },
        { name: 'SvelteKit', role: 'Frontend' },
        { name: 'Tailwind CSS', role: 'Styling' },
        { name: 'Zod', role: 'Validation' },
        { name: 'BullMQ', role: 'Job Queue' },
      ] as tech}
        <div class="flex items-center gap-4 rounded-xl border border-border/30 bg-card/40 px-5 py-4 backdrop-blur-sm">
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
