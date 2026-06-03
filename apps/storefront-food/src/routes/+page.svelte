<script lang="ts">
  import { goto } from '$app/navigation';
  import Search from '@lucide/svelte/icons/search';
  import Clock from '@lucide/svelte/icons/clock';
  import Star from '@lucide/svelte/icons/star';
  import MapPin from '@lucide/svelte/icons/map-pin';

  let { data } = $props();

  const categories = $derived(data.categories || []);
  const featuredItems = $derived(data.featuredItems || []);

  interface MenuItem {
    id: string;
    titleEn: string;
    salePrice: string | number;
    images: string[] | null;
  }

  interface CartLine {
    id: string;
    title: string;
    price: string | number;
    image: string | undefined;
    qty: number;
    variants: unknown[];
  }

  let searchQuery = $state('');

  function handleSearch() {
    if (searchQuery.trim()) {
      goto(`/menu?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function addToCart(item: MenuItem) {
    try {
      const cart = JSON.parse(localStorage.getItem('food-cart') || '[]') as CartLine[];
      const existing = cart.find((c: CartLine) => c.id === item.id);
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({
          id: item.id,
          title: item.titleEn,
          price: item.salePrice,
          image: item.images?.[0],
          qty: 1,
          variants: [],
        });
      }
      localStorage.setItem('food-cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch { /* ignore */ }
  }
</script>

<div class="space-y-8">
  <!-- Hero Section -->
  <section class="relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-8 text-white overflow-hidden">
    <div class="relative z-10 max-w-xl">
      <h1 class="text-3xl md:text-4xl font-bold mb-3">Hungry? We got you covered</h1>
      <p class="text-orange-100 mb-6">Order delicious food from the best restaurants. Fast delivery, fresh taste.</p>
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-1">
          <Clock class="w-4 h-4" />
          <span>30-45 min delivery</span>
        </div>
        <div class="flex items-center gap-1">
          <Star class="w-4 h-4" />
          <span>4.8 rating</span>
        </div>
        <div class="flex items-center gap-1">
          <MapPin class="w-4 h-4" />
          <span>Free delivery over $25</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Search -->
  <div class="max-w-xl mx-auto">
    <form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
      <input
        type="text"
        placeholder="Search for dishes, cuisines..."
        class="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
        bind:value={searchQuery}
      />
    </form>
  </div>

  <!-- Categories -->
  <section>
    <h2 class="text-xl font-bold mb-4">Browse by Category</h2>
    {#if categories.length === 0}
      <p class="text-neutral-500">No categories available</p>
    {:else}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {#each categories as category}
          <a
            href={`/menu?category=${category.id}`}
            class="bg-white rounded-xl p-4 text-center border hover:border-orange-300 hover:shadow-md transition-all group"
          >
            <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <span class="text-xl">{category.icon || '🍽️'}</span>
            </div>
            <p class="font-medium text-sm">{category.nameEn || category.name}</p>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Featured Items -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">Popular Dishes</h2>
      <a href="/menu" class="text-sm text-orange-600 hover:underline">View all</a>
    </div>
    {#if featuredItems.length === 0}
      <p class="text-neutral-500">No dishes available yet</p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {#each featuredItems as item}
          <div class="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all group">
            <div class="relative aspect-video bg-neutral-100">
              {#if item.images?.[0]}
                <img src={item.images[0]} alt={item.titleEn} class="w-full h-full object-cover" />
              {:else}
                <div class="w-full h-full flex items-center justify-center text-4xl">🍕</div>
              {/if}
              {#if item.isVegetarian}
                <span class="absolute top-2 left-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Veg</span>
              {/if}
            </div>
            <div class="p-4">
              <h3 class="font-semibold mb-1">{item.titleEn}</h3>
              <p class="text-sm text-neutral-500 line-clamp-2 mb-2">{item.descriptionEn || 'Delicious food'}</p>
              <div class="flex items-center justify-between">
                <span class="font-bold text-lg">${Number(item.salePrice).toFixed(2)}</span>
                <button
                  onclick={() => addToCart(item)}
                  class="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
