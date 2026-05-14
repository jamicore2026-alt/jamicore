<script lang="ts">
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
  import Menu from '@lucide/svelte/icons/menu';
  import X from '@lucide/svelte/icons/x';

  interface Props {
    storeName?: string;
    cartCount?: number;
  }

  let { storeName = 'Brio', cartCount = 0 }: Props = $props();
  let mobileOpen = $state(false);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Explore Menu', href: '/menu' },
    { label: 'Contact Us', href: '/contact' },
  ];
</script>

<header class="sticky top-0 z-50 bg-white border-b" style="border-color: #e5e5e5;">
  <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-2">
      <span class="text-xl font-bold" style="color: #1a4d2e;">{storeName}</span>
    </a>

    <!-- Desktop Nav -->
    <nav class="hidden md:flex items-center gap-6">
      {#each navLinks as link}
        <a
          href={link.href}
          class="text-sm font-medium transition-colors hover:text-[#1a4d2e]"
          style="color: #1a1a1a;"
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <!-- Right side -->
    <div class="flex items-center gap-3">
      <a href="/cart" class="relative p-2 rounded-full transition-colors hover:bg-[#e8f5e9]">
        <ShoppingCart class="w-5 h-5" style="color: #1a4d2e;" />
        {#if cartCount > 0}
          <span
            class="absolute -top-1 -right-1 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
            style="background-color: #1a4d2e;"
          >
            {cartCount}
          </span>
        {/if}
      </a>

      <!-- Mobile menu toggle -->
      <button
        class="md:hidden p-2 rounded-full transition-colors hover:bg-[#e8f5e9]"
        onclick={() => mobileOpen = !mobileOpen}
        aria-label="Toggle menu"
      >
        {#if mobileOpen}
          <X class="w-5 h-5" style="color: #1a4d2e;" />
        {:else}
          <Menu class="w-5 h-5" style="color: #1a4d2e;" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile Nav -->
  {#if mobileOpen}
    <nav class="md:hidden border-t px-4 py-3 space-y-2" style="border-color: #e5e5e5; background-color: #ffffff;">
      {#each navLinks as link}
        <a
          href={link.href}
          class="block text-sm font-medium py-2 transition-colors hover:text-[#1a4d2e]"
          style="color: #1a1a1a;"
          onclick={() => mobileOpen = false}
        >
          {link.label}
        </a>
      {/each}
    </nav>
  {/if}
</header>
