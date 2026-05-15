<script lang="ts">
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
  import Menu from '@lucide/svelte/icons/menu';
  import X from '@lucide/svelte/icons/x';
  import type { Customization } from '../themeTokens';
  import { getTokens } from '../themeTokens';

  interface Props {
    storeName?: string;
    storeSlug?: string;
    cartCount?: number;
    customization?: Customization;
  }

  let { storeName = 'Brio', storeSlug = '', cartCount = 0, customization = {} }: Props = $props();
  let mobileOpen = $state(false);

  const t = $derived(getTokens(customization));
  const basePath = $derived(storeSlug ? `/store/${storeSlug}/brio` : '');
  const navLinks = $derived([
    { label: 'Home', href: basePath || '/' },
    { label: 'Explore Menu', href: `${basePath}/menu` },
    { label: 'Contact Us', href: `${basePath}/contact` },
  ]);

  const headerBg = $derived(
    t.headerStyle === 'dark' ? t.primaryColor :
    t.headerStyle === 'transparent' ? 'transparent' :
    t.cardBg
  );
  const headerText = $derived(
    t.headerStyle === 'dark' ? t.footerText :
    t.textColor
  );
  const headerBorder = $derived(
    t.headerStyle === 'transparent' ? 'transparent' : t.borderColor
  );
</script>

<header
  class="sticky top-0 z-50 border-b"
  style="background-color: {headerBg}; border-color: {headerBorder};"
>
  <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
    <!-- Logo -->
    <a href={basePath || '/'} class="flex items-center gap-2 min-w-0">
      <span class="text-xl font-bold truncate" style="color: {t.headerStyle === 'dark' ? t.footerText : t.primaryColor};">{storeName}</span>
    </a>

    <!-- Desktop Nav -->
    <nav class="hidden md:flex items-center gap-6">
      {#each navLinks as link}
        <a
          href={link.href}
          class="text-sm font-medium transition-colors hover:opacity-80"
          style="color: {headerText};"
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <!-- Right side -->
    <div class="flex items-center gap-2 shrink-0">
      <a
        href={`${basePath}/cart`}
        class="relative p-2 rounded-full transition-colors"
        style="color: {t.primaryColor};"
        aria-label="Shopping cart"
      >
        <ShoppingCart class="w-5 h-5" />
        {#if cartCount > 0}
          <span
            class="absolute -top-1 -right-1 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1"
            style="background-color: {t.primaryColor};"
          >
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        {/if}
      </a>

      <!-- Mobile menu toggle -->
      <button
        class="md:hidden p-2 rounded-full transition-colors"
        style="color: {t.primaryColor};"
        onclick={() => mobileOpen = !mobileOpen}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
      >
        {#if mobileOpen}
          <X class="w-5 h-5" />
        {:else}
          <Menu class="w-5 h-5" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile Nav -->
  {#if mobileOpen}
    <nav
      class="md:hidden border-t px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto"
      style="border-color: {t.borderColor}; background-color: {headerBg};"
    >
      {#each navLinks as link}
        <a
          href={link.href}
          class="block text-sm font-medium py-2.5 px-2 rounded transition-colors"
          style="color: {headerText};"
          onclick={() => mobileOpen = false}
        >
          {link.label}
        </a>
      {/each}
    </nav>
  {/if}
</header>
