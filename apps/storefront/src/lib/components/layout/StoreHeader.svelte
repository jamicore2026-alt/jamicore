<script lang="ts">
  import { Menu, Search, ShoppingCart, Heart, User } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import CartDrawer from '$lib/components/cart/CartDrawer.svelte';
  import { getCart, openCartDrawer, closeCartDrawer } from '$lib/stores/cart.svelte';

  interface Props {
    storeName?: string;
    logoUrl?: string | null;
    showSearch?: boolean;
    showWishlist?: boolean;
    isLoggedIn?: boolean;
    cartCount?: number;
  }

  let { storeName = 'Store', logoUrl, showSearch = true, showWishlist = true, isLoggedIn = false, cartCount = 0 }: Props = $props();

  let mobileMenuOpen = $state(false);
  let searchOpen = $state(false);
  let searchQuery = $state('');

  const cartState = getCart();

  let effectiveCartCount = $derived(cartCount || cartState.cart?.itemCount || 0);

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  function closeSearch() {
    searchOpen = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (mobileMenuOpen) closeMobileMenu();
      if (searchOpen) closeSearch();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<header class="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Mobile menu button -->
      <Button
        variant="ghost"
        size="icon"
        class="lg:hidden"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        <Menu class="size-5" />
      </Button>

      <!-- Logo -->
      <a href="/" class="flex items-center gap-2 shrink-0">
        {#if logoUrl}
          <img src={logoUrl} alt={storeName} class="h-8 w-auto" />
        {:else}
          <span class="text-xl font-bold text-[var(--color-primary)]">{storeName}</span>
        {/if}
      </a>

      <!-- Desktop nav -->
      <nav class="hidden lg:flex items-center gap-6 ml-8">
        <a href="/" class="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">Home</a>
        <a href="/products" class="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Products</a>
        <a href="/about" class="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">About</a>
      </nav>

      <!-- Right actions -->
      <div class="flex items-center gap-2">
        {#if showSearch}
          <Button variant="ghost" size="icon" aria-label="Search" onclick={() => (searchOpen = !searchOpen)}>
            <Search class="size-5" />
          </Button>
        {/if}

        {#if showWishlist && isLoggedIn}
          <a href="/account/wishlist" aria-label="Wishlist">
            <Button variant="ghost" size="icon">
              <Heart class="size-5" />
            </Button>
          </a>
        {/if}

        <button class="relative" aria-label="Cart" onclick={openCartDrawer}>
          <div class="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface)] transition-colors">
            <ShoppingCart class="size-5 text-[var(--color-text-secondary)]" />
            {#if effectiveCartCount > 0}
              <span class="absolute -top-1 -right-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded-full size-5 flex items-center justify-center">
                {effectiveCartCount}
              </span>
            {/if}
          </div>
        </button>

        {#if isLoggedIn}
          <a href="/account">
            <Button variant="ghost" size="icon" aria-label="Account">
              <User class="size-5" />
            </Button>
          </a>
        {:else}
          <a href="/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </a>
        {/if}
      </div>
    </div>
  </div>

  <!-- Search bar -->
  {#if searchOpen}
    <div class="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <form action="/products" method="get" class="max-w-xl mx-auto flex gap-2">
        <input
          type="text"
          name="q"
          bind:value={searchQuery}
          placeholder="Search products..."
          class="flex-1 px-4 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          autofocus
        />
        <Button type="submit" size="sm">Search</Button>
      </form>
    </div>
  {/if}

  <!-- Mobile nav overlay + backdrop -->
  {#if mobileMenuOpen}
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-30 bg-black/25 lg:hidden"
      onclick={closeMobileMenu}
      role="presentation"
    ></div>

    <!-- Mobile menu panel -->
    <div class="lg:hidden absolute top-full left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 space-y-1 shadow-lg"
    >
      <a href="/" class="block text-sm font-medium py-2.5 px-3 rounded-[var(--radius-md)] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors">Home</a>
      <a href="/products" class="block text-sm font-medium py-2.5 px-3 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors">Products</a>
      <a href="/about" class="block text-sm font-medium py-2.5 px-3 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors">About</a>
      <hr class="border-[var(--color-border)] my-2" />
      {#if isLoggedIn}
        <a href="/account" class="block text-sm font-medium py-2.5 px-3 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors">My Account</a>
        <a href="/account/orders" class="block text-sm font-medium py-2.5 px-3 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors">Orders</a>
      {:else}
        <a href="/login" class="block text-sm font-medium py-2.5 px-3 rounded-[var(--radius-md)] text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors">Sign In</a>
        <a href="/register" class="block text-sm font-medium py-2.5 px-3 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors">Create Account</a>
      {/if}
    </div>
  {/if}
</header>

<CartDrawer
  cart={cartState.cart}
  open={cartState.drawerOpen}
  onClose={closeCartDrawer}
/>
