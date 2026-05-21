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
      scrolled = window.scrollY > 20;
    });
  }
</script>

<nav
  class="fixed top-0 z-50 w-full transition-all duration-500 {scrolled
    ? 'border-b border-border/50 bg-background/70 backdrop-blur-xl'
    : 'bg-transparent'}"
>
  <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
    <a href="/" class="group flex items-center gap-2.5">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 transition-all group-hover:bg-accent/20"
      >
        <Zap class="h-4 w-4 text-accent" stroke-width={2.5} />
      </div>
      <span class="font-serif text-xl font-semibold tracking-tight text-foreground">
        jamicore
      </span>
    </a>

    <!-- Desktop -->
    <div class="hidden items-center gap-1 md:flex">
      {#each navLinks as link}
        <a
          href={link.href}
          class="relative px-4 py-2 text-sm font-medium transition-colors {isActive(link.href)
            ? 'text-accent'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          {link.label}
          {#if isActive(link.href)}
            <span
              class="absolute bottom-0 left-1/2 h-px w-6 -translate-x-1/2 bg-accent"
            ></span>
          {/if}
        </a>
      {/each}
      <a
        href="/register"
        class="ml-4 rounded-full border border-accent/30 bg-accent/10 px-5 py-2 text-sm font-medium text-accent transition-all hover:border-accent/60 hover:bg-accent/20"
      >
        Get Started
      </a>
    </div>

    <!-- Mobile toggle -->
    <button
      class="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
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
    <div
      class="border-b border-border/50 bg-background/95 backdrop-blur-xl px-4 py-6 md:hidden"
    >
      <div class="flex flex-col gap-2">
        {#each navLinks as link}
          <a
            href={link.href}
            class="rounded-lg px-4 py-3 text-sm font-medium transition-colors {isActive(link.href)
              ? 'bg-accent/10 text-accent'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
            onclick={() => (mobileOpen = false)}
          >
            {link.label}
          </a>
        {/each}
        <a
          href="/register"
          class="mt-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm font-medium text-accent"
          onclick={() => (mobileOpen = false)}
        >
          Get Started
        </a>
      </div>
    </div>
  {/if}
</nav>
