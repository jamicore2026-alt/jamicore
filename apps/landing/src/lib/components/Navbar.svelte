<script lang="ts">
  import { page } from '$app/state';
  import { Menu, X, Rocket } from '@lucide/svelte';

  let mobileOpen = $state(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
  ];

  function isActive(href: string) {
    return page.url.pathname === href;
  }
</script>

<nav class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
  <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
    <a href="/" class="flex items-center gap-2 text-xl font-bold text-foreground">
      <Rocket class="h-6 w-6 text-accent" />
      jamicore
    </a>

    <!-- Desktop -->
    <div class="hidden items-center gap-8 md:flex">
      {#each navLinks as link}
        <a
          href={link.href}
          class="text-sm font-medium transition-colors {isActive(link.href) ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}"
        >
          {link.label}
        </a>
      {/each}
      <a
        href="/register"
        class="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
      >
        Get Started
      </a>
    </div>

    <!-- Mobile toggle -->
    <button
      class="md:hidden"
      onclick={() => (mobileOpen = !mobileOpen)}
      aria-label="Toggle menu"
    >
      {#if mobileOpen}
        <X class="h-6 w-6" />
      {:else}
        <Menu class="h-6 w-6" />
      {/if}
    </button>
  </div>

  {#if mobileOpen}
    <div class="border-t border-border px-4 py-4 md:hidden">
      <div class="flex flex-col gap-4">
        {#each navLinks as link}
          <a
            href={link.href}
            class="text-sm font-medium {isActive(link.href) ? 'text-accent' : 'text-muted-foreground'}"
            onclick={() => (mobileOpen = false)}
          >
            {link.label}
          </a>
        {/each}
        <a
          href="/register"
          class="rounded-md bg-accent px-4 py-2 text-center text-sm font-medium text-accent-foreground"
          onclick={() => (mobileOpen = false)}
        >
          Get Started
        </a>
      </div>
    </div>
  {/if}
</nav>
