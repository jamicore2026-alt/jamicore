<script lang="ts">
  import { page } from '$app/state';
  import { Menu, X, Zap } from '@lucide/svelte';

  let mobileOpen = $state(false);
  let scrolled = $state(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
  ];

  function isActive(href: string) {
    return page.url.pathname === href;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      scrolled = window.scrollY > 10;
    });
  }
</script>

<nav
  class="fixed top-0 z-50 w-full transition-all duration-300 {scrolled
    ? 'border-b border-border bg-white/90 shadow-sm backdrop-blur-lg'
    : 'bg-white'}"
>
  <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
    <a href="/" class="group flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/10">
        <Zap class="h-4 w-4 text-emerald" stroke-width={2.5} />
      </div>
      <span class="text-xl font-bold tracking-tight text-navy">jamicore</span>
    </a>

    <!-- Desktop -->
    <div class="hidden items-center gap-1 md:flex">
      {#each navLinks as link}
        <a
          href={link.href}
          class="px-4 py-2 text-sm font-medium transition-colors {isActive(link.href)
            ? 'text-emerald'
            : 'text-gray-500 hover:text-navy'}"
        >
          {link.label}
        </a>
      {/each}
      <a
        href="/register"
        class="ml-3 rounded-lg bg-emerald px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald/20 transition-all hover:bg-emerald-dark hover:shadow-emerald/30"
      >
        Start Free Trial
      </a>
    </div>

    <!-- Mobile toggle -->
    <button
      class="rounded-lg p-2 text-gray-500 transition-colors hover:text-navy md:hidden"
      onclick={() => (mobileOpen = !mobileOpen)}
      aria-label="Toggle menu"
    >
      {#if mobileOpen}
        <X class="h-5 w-5" />
      {:else}
        <Menu class="h-5 w-5" />
      {/if}
    </button>
  </div>

  {#if mobileOpen}
    <div class="border-b border-border bg-white px-4 py-6 md:hidden">
      <div class="flex flex-col gap-2">
        {#each navLinks as link}
          <a
            href={link.href}
            class="rounded-lg px-4 py-3 text-sm font-medium transition-colors {isActive(link.href)
              ? 'bg-emerald/5 text-emerald'
              : 'text-gray-500 hover:bg-gray-50 hover:text-navy'}"
            onclick={() => (mobileOpen = false)}
          >
            {link.label}
          </a>
        {/each}
        <a
          href="/register"
          class="mt-2 rounded-lg bg-emerald px-4 py-3 text-center text-sm font-semibold text-white"
          onclick={() => (mobileOpen = false)}
        >
          Start Free Trial
        </a>
      </div>
    </div>
  {/if}
</nav>
