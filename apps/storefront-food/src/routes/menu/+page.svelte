<script lang="ts">
  import { goto } from '$app/navigation';
  import Search from '@lucide/svelte/icons/search';

  let { data } = $props();

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

  const items = $derived(data.items || []);
  const categories = $derived(data.categories || []);
  const activeCategory = $derived(data.category);
  const searchQuery = $derived(data.search || '');

  let localSearch = $state(data.search || '');

  function filterCategory(catId: string) {
    const params = new URLSearchParams();
    if (catId) params.set('category', catId);
    if (localSearch) params.set('search', localSearch);
    goto(`/menu?${params}`);
  }

  function doSearch() {
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (localSearch) params.set('search', localSearch);
    goto(`/menu?${params}`);
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

<div class="space-y-6">
  <!-- Search + Filters -->
  <div class="flex flex-col sm:flex-row gap-3">
    <form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
      <input
        type="text"
        placeholder="Search dishes..."
        class="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
        bind:value={localSearch}
      />
    </form>
  </div>

  <!-- Category Chips -->
  <div class="flex gap-2 overflow-x-auto pb-2">
    <button
      class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors {activeCategory ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' : 'bg-orange-600 text-white'}"
      onclick={() => filterCategory('')}
    >
      All
    </button>
    {#each categories as cat}
      <button
        class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors {activeCategory === cat.id ? 'bg-orange-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}"
        onclick={() => filterCategory(cat.id)}
      >
        {cat.nameEn || cat.name}
      </button>
    {/each}
  </div>

  <!-- Menu Grid -->
  {#if items.length === 0}
    <div class="text-center py-16">
      <p class="text-neutral-500 text-lg">No dishes found</p>
      {#if searchQuery}
        <p class="text-sm text-neutral-400 mt-1">Try a different search term</p>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each items as item}
        <div class="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all">
          <a href={`/menu/${item.id}`} class="block relative aspect-video bg-neutral-100">
            {#if item.images?.[0]}
              <img src={item.images[0]} alt={item.titleEn} class="w-full h-full object-cover" />
            {:else}
              <div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
            {/if}
            {#if item.isVegetarian}
              <span class="absolute top-2 left-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Veg</span>
            {/if}
            {#if item.spicyLevel}
              <span class="absolute top-2 right-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">{'🌶️'.repeat(item.spicyLevel)}</span>
            {/if}
          </a>
          <div class="p-4">
            <a href={`/menu/${item.id}`}>
              <h3 class="font-semibold mb-1 hover:text-orange-600 transition-colors">{item.titleEn}</h3>
            </a>
            <p class="text-sm text-neutral-500 line-clamp-2 mb-3">{item.descriptionEn || ''}</p>
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-lg">${Number(item.salePrice).toFixed(2)}</span>
                {#if item.purchasePrice && item.purchasePrice !== item.salePrice}
                  <span class="text-sm text-neutral-400 line-through ml-1">${Number(item.purchasePrice).toFixed(2)}</span>
                {/if}
              </div>
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
</div>
