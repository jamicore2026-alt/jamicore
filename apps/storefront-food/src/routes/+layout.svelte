<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  let { data, children } = $props();

  interface CartItem {
    qty: number;
  }

  let cartCount = $state(0);

  onMount(() => {
    // Load cart from localStorage for guest users
    try {
      const cart = JSON.parse(localStorage.getItem('food-cart') || '[]');
      cartCount = cart.reduce((sum: number, item: CartItem) => sum + (item.qty || 0), 0);
    } catch { /* ignore */ }

    // Check theme and redirect if needed
    if (data.store?.domain && !window.location.pathname.includes('/brio')) {
      const checkTheme = async () => {
        try {
          const res = await fetch(`/api/v1/public/stores/${data.store.domain}/theme`);
          if (res.ok) {
            const { theme } = await res.json();
            if (theme?.themeName === 'brio') {
              window.location.href = `/store/${data.store.domain}/brio`;
            }
          }
        } catch { /* ignore */ }
      };
      checkTheme();
    }

    const updateCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('food-cart') || '[]');
        cartCount = cart.reduce((sum: number, item: CartItem) => sum + (item.qty || 0), 0);
      } catch { /* ignore */ }
    };
    window.addEventListener('cart-updated', updateCart);
    return () => window.removeEventListener('cart-updated', updateCart);
  });
</script>

<div class="min-h-screen bg-neutral-50 text-neutral-900">
  <!-- Food Store Header -->
  <header class="sticky top-0 z-50 bg-white border-b shadow-sm">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <span class="text-xl font-bold text-orange-600">{data.store?.name || 'FoodHub'}</span>
      </a>
      <div class="flex items-center gap-3">
        <a href="/menu" class="text-sm font-medium hover:text-orange-600 transition-colors">Menu</a>
        <a href="/cart" class="relative p-2 hover:bg-orange-50 rounded-full transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {#if cartCount > 0}
            <span class="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
          {/if}
        </a>
        {#if data.isLoggedIn}
          <a href="/account" class="text-sm font-medium hover:text-orange-600 transition-colors">Account</a>
        {:else}
          <a href="/login" class="text-sm font-medium hover:text-orange-600 transition-colors">Login</a>
        {/if}
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-6">
    {@render children()}
  </main>

  <!-- Simple Footer -->
  <footer class="bg-white border-t py-6 mt-12">
    <div class="max-w-6xl mx-auto px-4 text-center text-sm text-neutral-500">
      <p>{data.store?.name || 'FoodHub'} - Delicious food delivered to your door</p>
    </div>
  </footer>
</div>
