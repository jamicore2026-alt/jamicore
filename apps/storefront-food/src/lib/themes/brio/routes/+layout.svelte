<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import Header from '../components/Header.svelte';
  import Footer from '../components/Footer.svelte';

  interface Props {
    data: {
      store?: { name?: string; domain?: string } | null;
      slug?: string;
    };
    children: Snippet;
  }

  let { data, children }: Props = $props();

  let cartCount = $state(0);

  const storeSlug = $derived(data.slug || data.store?.domain || '');

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

<div class="min-h-screen bg-white text-neutral-900">
  <Header storeName={data.store?.name} storeSlug={storeSlug} cartCount={cartCount} />
  <main>
    {@render children()}
  </main>
  <Footer storeName={data.store?.name} />
</div>
