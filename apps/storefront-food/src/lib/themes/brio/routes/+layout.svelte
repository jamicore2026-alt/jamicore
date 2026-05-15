<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import Header from '../components/Header.svelte';
  import Footer from '../components/Footer.svelte';
  import { cssVars } from '../themeTokens';

  interface Props {
    data: {
      store?: { name?: string; domain?: string } | null;
      theme?: Record<string, unknown>;
      slug?: string;
    };
    children: Snippet;
  }

  let { data, children }: Props = $props();

  let cartCount = $state(0);

  const storeSlug = $derived(data.slug || data.store?.domain || '');
  const customization = $derived(
    (data.theme?.customization as Record<string, string>) || {}
  );
  const themeVars = $derived(cssVars(customization));

  onMount(() => {
    const updateCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('food-cart') || '[]');
        cartCount = cart.reduce((sum: number, item: { qty?: number }) => sum + (item.qty || 0), 0);
      } catch { /* ignore */ }
    };
    updateCart();
    window.addEventListener('cart-updated', updateCart);
    return () => window.removeEventListener('cart-updated', updateCart);
  });
</script>

<svelte:head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap');
  </style>
</svelte:head>

<div class="min-h-screen" style="{themeVars}; background-color: var(--brio-bg); color: var(--brio-text); font-family: var(--brio-font);">
  <Header storeName={data.store?.name} storeSlug={storeSlug} cartCount={cartCount} {customization} />
  <main>
    {@render children()}
  </main>
  <Footer storeName={data.store?.name} {customization} />
</div>
