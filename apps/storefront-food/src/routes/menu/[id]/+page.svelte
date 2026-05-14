<script lang="ts">
  import { goto } from '$app/navigation';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';

  let { data } = $props();

  const item = $derived(data.item);

  let qty = $state(1);
  let selectedSize = $state('regular');
  let selectedSpice = $state('medium');
  let instructions = $state('');

  const sizes = [
    { id: 'small', label: 'Small', priceModifier: -2 },
    { id: 'regular', label: 'Regular', priceModifier: 0 },
    { id: 'large', label: 'Large', priceModifier: 3 },
  ];

  const spiceLevels = [
    { id: 'mild', label: 'Mild' },
    { id: 'medium', label: 'Medium' },
    { id: 'hot', label: 'Hot' },
    { id: 'extra-hot', label: 'Extra Hot' },
  ];

  const basePrice = $derived(Number(item?.salePrice || 0));
  const sizeModifier = $derived(sizes.find(s => s.id === selectedSize)?.priceModifier || 0);
  const totalPrice = $derived((basePrice + sizeModifier) * qty);

  function addToCart() {
    if (!item) return;
    try {
      const cart = JSON.parse(localStorage.getItem('food-cart') || '[]');
      const cartItem = {
        id: item.id,
        title: item.titleEn,
        price: basePrice + sizeModifier,
        image: item.images?.[0],
        qty,
        variants: [
          { name: 'Size', value: selectedSize },
          { name: 'Spice', value: selectedSpice },
        ],
        instructions: instructions || undefined,
      };
      const existing = cart.find((c: any) =>
        c.id === item.id &&
        c.variants?.[0]?.value === selectedSize &&
        c.variants?.[1]?.value === selectedSpice
      );
      if (existing) {
        existing.qty += qty;
      } else {
        cart.push(cartItem);
      }
      localStorage.setItem('food-cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart-updated'));
      goto('/cart');
    } catch { /* ignore */ }
  }
</script>

{#if !item}
  <div class="text-center py-16">
    <p class="text-neutral-500">Item not found</p>
    <a href="/menu" class="text-orange-600 hover:underline mt-2 inline-block">Back to menu</a>
  </div>
{:else}
  <div class="max-w-2xl mx-auto">
    <button onclick={() => history.back()} class="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
      <ArrowLeft class="w-4 h-4" /> Back
    </button>

    <div class="bg-white rounded-2xl border overflow-hidden">
      <div class="aspect-video bg-neutral-100">
        {#if item.images?.[0]}
          <img src={item.images[0]} alt={item.titleEn} class="w-full h-full object-cover" />
        {:else}
          <div class="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        {/if}
      </div>

      <div class="p-6 space-y-6">
        <div>
          <h1 class="text-2xl font-bold">{item.titleEn}</h1>
          <p class="text-neutral-500 mt-1">{item.descriptionEn || ''}</p>
        </div>

        <!-- Size Selector -->
        <div>
          <label class="text-sm font-medium mb-2 block">Size</label>
          <div class="flex gap-2">
            {#each sizes as size}
              <button
                class="flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors {selectedSize === size.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-neutral-200 hover:border-neutral-300'}"
                onclick={() => selectedSize = size.id}
              >
                {size.label}
                {#if size.priceModifier !== 0}
                  <span class="text-xs ml-1">{size.priceModifier > 0 ? '+' : ''}${size.priceModifier}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Spice Level -->
        <div>
          <label class="text-sm font-medium mb-2 block">Spice Level</label>
          <div class="flex gap-2">
            {#each spiceLevels as spice}
              <button
                class="flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors {selectedSpice === spice.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-neutral-200 hover:border-neutral-300'}"
                onclick={() => selectedSpice = spice.id}
              >
                {spice.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Special Instructions -->
        <div>
          <label class="text-sm font-medium mb-2 block">Special Instructions</label>
          <textarea
            bind:value={instructions}
            placeholder="e.g., No onions, extra sauce..."
            class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none"
            rows={2}
          />
        </div>

        <!-- Quantity + Add to Cart -->
        <div class="flex items-center gap-4 pt-4 border-t">
          <div class="flex items-center gap-3">
            <button
              onclick={() => qty = Math.max(1, qty - 1)}
              class="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors"
            >
              <Minus class="w-4 h-4" />
            </button>
            <span class="w-8 text-center font-semibold">{qty}</span>
            <button
              onclick={() => qty += 1}
              class="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>

          <button
            onclick={addToCart}
            class="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 active:scale-95 transition-all"
          >
            Add to Cart - ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
