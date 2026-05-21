<script lang="ts">
  import {
    ArrowRight,
    Check,
    ChevronDown,
    Layers,
    PackageCheck,
    MessageCircle,
    BarChart3,
    Boxes,
    Shield,
    TrendingUp,
    Users,
    ShoppingCart,
    DollarSign,
    Minus,
  } from '@lucide/svelte';

  // Features
  const features = [
    {
      icon: Layers,
      title: 'Multi-Tenant',
      subtitle: 'Management',
      description: 'Run multiple storefronts from a single dashboard. Perfect for agencies and multi-brand businesses.',
    },
    {
      icon: PackageCheck,
      title: 'Order',
      subtitle: 'Tracking',
      description: 'Real-time order status, shipping updates, and automated customer notifications at every step.',
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      subtitle: 'CRM',
      description: 'Native WhatsApp Business integration for customer support, order updates, and marketing campaigns.',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      subtitle: 'Dashboard',
      description: 'Comprehensive sales, customer, and inventory analytics with exportable reports and insights.',
    },
    {
      icon: Boxes,
      title: 'Inventory',
      subtitle: 'Management',
      description: 'Track stock levels across all stores, set low-stock alerts, and manage variants with ease.',
    },
    {
      icon: Shield,
      title: 'Enterprise',
      subtitle: 'Security',
      description: 'JWT auth, role-based access control, audit logging, and SOC 2 compliant infrastructure.',
    },
  ];

  // Dashboard preview stats (demo data)
  const dashboardStats = [
    { label: 'Total Revenue', value: 'AED 2.4M', change: '+12.5%', icon: DollarSign },
    { label: 'Orders Today', value: '1,284', change: '+8.2%', icon: ShoppingCart },
    { label: 'Active Customers', value: '8,432', change: '+15.1%', icon: Users },
    { label: 'Conversion Rate', value: '4.8%', change: '+0.6%', icon: TrendingUp },
  ];

  // Pricing
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

  // No testimonials yet — add real ones once you have customer permission

  // FAQ
  let openFaq = $state(-1);
  const faqs = [
    {
      q: 'Can I manage multiple stores from one account?',
      a: 'Yes. jamicore is built multi-tenant from the ground up. You can create and manage unlimited storefronts from a single dashboard, each with its own domain, products, and settings.',
    },
    {
      q: 'Does jamicore support Arabic and RTL languages?',
      a: 'Absolutely. Every storefront supports full Arabic translation, RTL layouts, and local payment methods including Tabby, Telr, and Apple Pay.',
    },
    {
      q: 'How does the WhatsApp CRM integration work?',
      a: 'Connect your WhatsApp Business API account in one click. Send order confirmations, shipping updates, abandoned cart reminders, and support messages — all automated and personalized.',
    },
    {
      q: 'Is my customer data secure?',
      a: 'jamicore is SOC 2 compliant with end-to-end encryption, JWT-based authentication, role-based access control, and comprehensive audit logging. Your data is hosted in regional data centers for compliance.',
    },
    {
      q: 'Can I migrate from Shopify or WooCommerce?',
      a: 'Yes. We offer a free migration service that imports your products, customers, and orders. Most migrations complete within 48 hours with zero downtime.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We support Visa, Mastercard, Apple Pay, Google Pay, Tabby (Buy Now Pay Later), Telr, and Cash on Delivery — all configurable per store and region.',
    },
  ];
</script>

<svelte:head>
  <title>jamicore — E-Commerce That Scales With You</title>
  <meta
    name="description"
    content="The enterprise multi-tenant e-commerce platform built for modern merchants. Launch stores, manage products, track orders, and grow."
  />
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden bg-gray-50 pt-28 pb-20 lg:pt-36 lg:pb-28">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <!-- Left -->
      <div class="max-w-xl">
        <div
          class="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-4 py-1.5 text-xs font-semibold text-emerald"
        >
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald"></span>
          </span>
          Headless multi-tenant e-commerce platform
        </div>

        <h1 class="text-4xl font-extrabold tracking-tight text-navy sm:text-5xl lg:text-6xl">
          E-Commerce
          <br />
          <span class="font-serif italic text-emerald">That Scales</span>
          <br />
          With You
        </h1>

        <p class="mt-6 text-lg leading-relaxed text-gray-500">
          The headless multi-tenant platform built for merchants who refuse to compromise.
          One backend. Unlimited storefronts. Complete control over your brand.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="/register"
            class="group inline-flex items-center gap-2 rounded-lg bg-emerald px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald/20 transition-all hover:bg-emerald-dark hover:shadow-emerald/30"
          >
            Start Free Trial
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="/pricing"
            class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-7 py-3.5 text-sm font-semibold text-navy transition-colors hover:border-emerald/30 hover:bg-emerald/5"
          >
            View Pricing
          </a>
        </div>

        <div class="mt-10 flex items-center gap-6 text-xs text-gray-400">
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4 text-emerald" />
            No credit card required
          </div>
          <div class="h-4 w-px bg-gray-200"></div>
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4 text-emerald" />
            14-day free trial
          </div>
          <div class="h-4 w-px bg-gray-200"></div>
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4 text-emerald" />
            SOC 2 Compliant
          </div>
        </div>
      </div>

      <!-- Right: Dashboard Mockup -->
      <div class="relative hidden lg:block">
        <div class="relative rounded-xl border border-gray-200 bg-white p-2 shadow-2xl shadow-navy/10">
          <!-- Mockup Header -->
          <div class="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3">
            <div class="flex gap-1.5">
              <div class="h-3 w-3 rounded-full bg-red-400"></div>
              <div class="h-3 w-3 rounded-full bg-amber-400"></div>
              <div class="h-3 w-3 rounded-full bg-emerald"></div>
            </div>
            <span class="ml-2 text-xs font-medium text-gray-400">jamicore Dashboard</span>
          </div>

          <div class="mt-2 grid grid-cols-2 gap-2">
            {#each dashboardStats as stat}
              <div class="rounded-lg border border-gray-100 bg-white p-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-400">{stat.label}</span>
                  <stat.icon class="h-4 w-4 text-gray-300" />
                </div>
                <div class="mt-2 text-lg font-bold text-navy">{stat.value}</div>
                <div class="mt-1 text-xs font-medium text-emerald">{stat.change}</div>
              </div>
            {/each}
          </div>

          <div class="mt-2 rounded-lg border border-gray-100 bg-white p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-500">Revenue Overview</span>
              <span class="text-xs text-gray-400">Last 7 days</span>
            </div>
            <div class="mt-3 flex items-end gap-1">
              {#each [35, 45, 30, 55, 40, 60, 75] as h}
                <div class="flex-1 rounded-t">
                  <div class="rounded-t bg-emerald/20" style="height: {h * 1.5}px"></div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Decorative blurred shape -->
        <div
          class="absolute -right-10 -top-10 -z-10 h-64 w-64 rounded-full bg-emerald/10 blur-3xl"
        ></div>
        <div
          class="absolute -bottom-10 -left-10 -z-10 h-48 w-48 rounded-full bg-navy/5 blur-3xl"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- Trusted By — add real logos once you have permission -->

<!-- Features -->
<section class="py-24 lg:py-32">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Platform</p>
      <h2 class="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
        Everything you need to
        <span class="font-serif italic">sell smarter</span>
      </h2>
      <p class="mt-4 text-lg text-gray-500">
        Built for modern commerce — from a single boutique to a network of stores across regions.
      </p>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as feature}
        <div
          class="group rounded-xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-emerald/20 hover:shadow-md"
        >
          <div class="mb-5 inline-flex rounded-lg bg-emerald/10 p-3">
            <feature.icon class="h-5 w-5 text-emerald" stroke-width={1.5} />
          </div>
          <h3 class="text-lg font-semibold text-navy">
            {feature.title}
            <span class="font-serif italic text-emerald">{feature.subtitle}</span>
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Dashboard Preview -->
<section class="overflow-hidden bg-gray-50 py-24 lg:py-32">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Dashboard</p>
      <h2 class="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
        Your business at a
        <span class="font-serif italic">glance</span>
      </h2>
      <p class="mt-4 text-lg text-gray-500">
        Real-time analytics, order tracking, and customer insights — all in one unified dashboard.
      </p>
    </div>

    <div class="relative rounded-xl border border-gray-200 bg-white p-6 shadow-xl shadow-navy/5 lg:p-10">
      <!-- Dashboard mockup larger -->
      <div class="grid gap-6 lg:grid-cols-4">
        {#each dashboardStats as stat}
          <div class="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-500">{stat.label}</span>
              <div class="rounded-md bg-white p-1.5">
                <stat.icon class="h-4 w-4 text-emerald" />
              </div>
            </div>
            <div class="mt-3 text-2xl font-bold text-navy">{stat.value}</div>
            <div class="mt-1 flex items-center gap-1 text-xs font-medium text-emerald">
              <TrendingUp class="h-3 w-3" />
              {stat.change} this week
            </div>
          </div>
        {/each}
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <!-- Revenue chart -->
        <div class="lg:col-span-2 rounded-lg border border-gray-100 bg-gray-50/50 p-5">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-navy">Revenue Overview</span>
            <span class="text-xs text-gray-400">Last 30 days</span>
          </div>
          <div class="mt-4 flex items-end gap-2">
            {#each [30, 45, 35, 50, 40, 60, 55, 70, 65, 80, 75, 90, 85, 100, 95, 110, 105, 120, 115, 130, 125, 140, 135, 150, 145, 160, 155, 170, 165, 180] as h}
              <div class="flex-1 rounded-t transition-all hover:bg-emerald/30">
                <div class="rounded-t bg-emerald/20" style="height: {h * 0.6}px"></div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Recent orders -->
        <div class="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
          <span class="text-sm font-semibold text-navy">Recent Orders</span>
          <div class="mt-4 space-y-3">
            {#each [
              { id: '#4821', amount: 'AED 349', status: 'Completed' },
              { id: '#4820', amount: 'AED 1,250', status: 'Processing' },
              { id: '#4819', amount: 'AED 89', status: 'Completed' },
              { id: '#4818', amount: 'AED 567', status: 'Shipped' },
            ] as order}
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-navy">{order.id}</span>
                <span class="text-xs text-gray-500">{order.amount}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Pricing -->
<section id="pricing" class="py-24 lg:py-32">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Pricing</p>
      <h2 class="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
        Simple,
        <span class="font-serif italic">transparent</span>
        pricing
      </h2>
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
</section>

<!-- Testimonials — add real ones once you have customer permission -->

<!-- FAQ -->
<section class="py-24 lg:py-32">
  <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 text-center">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">FAQ</p>
      <h2 class="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
        Common
        <span class="font-serif italic">questions</span>
      </h2>
    </div>

    <div class="space-y-3">
      {#each faqs as faq, i}
        <div class="rounded-xl border border-gray-100 bg-white shadow-sm">
          <button
            class="flex w-full items-center justify-between px-6 py-5 text-left"
            onclick={() => (openFaq = openFaq === i ? -1 : i)}
          >
            <span class="text-sm font-semibold text-navy">{faq.q}</span>
            <ChevronDown
              class="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 {openFaq === i ? 'rotate-180' : ''}"
            />
          </button>
          {#if openFaq === i}
            <div class="px-6 pb-5">
              <p class="text-sm leading-relaxed text-gray-500">{faq.a}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="bg-navy py-24 lg:py-32">
  <div class="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
    <h2 class="text-4xl font-bold tracking-tight text-white sm:text-5xl">
      Ready to
      <span class="font-serif italic text-emerald">start selling?</span>
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-gray-400">
      Join the merchants using jamicore to power their online stores.
      No credit card required to get started.
    </p>
    <div class="mt-8">
      <a
        href="/register"
        class="group inline-flex items-center gap-2 rounded-lg bg-emerald px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald/20 transition-all hover:bg-emerald-dark"
      >
        Create Free Account
        <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </a>
    </div>
  </div>
</section>
