<script lang="ts">
  import { goto } from '$app/navigation';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import { getTokens, btnClasses, btnStyle } from '../../../themeTokens';

  interface Props {
    data: {
      product?: Record<string, unknown> | null;
      theme?: Record<string, unknown>;
      store?: { domain?: string } | null;
      slug?: string;
    };
  }

  let { data }: Props = $props();

  const product = $derived(data.product as Record<string, unknown> | null);
  const storeSlug = $derived(data.slug || data.store?.domain || '');
  const cartPath = $derived(storeSlug ? `/store/${storeSlug}/brio/cart` : '/cart');
  const customization = $derived((data.theme?.customization as Record<string, string>) || {});
  const t = $derived(getTokens(customization));

  let qty = $state(1);
  let selectedSize = $state('regular');
  let selectedSpice = $state('medium');

  const sizes = [
    { id: 'small', label: 'Small', priceModifier: -2 },
    { id: 'regular', label: 'Regular', priceModifier: 0 },
    { id: 'large', label: 'Large', priceModifier: 3 },
  ];

  const spiceLevels = [
    { id: 'mild', label: 'Mild' },
    { id: 'medium', label: 'Medium' },
    { id: 'hot', label: 'Hot' },
  ];

  const basePrice = $derived(Number(product?.price || product?.salePrice || 0));
  const sizeModifier = $derived(sizes.find((s) => s.id === selectedSize)?.priceModifier || 0);
  const totalPrice = $derived((basePrice + sizeModifier) * qty);

  function addToCart() {
    if (!product) return;
    try {
      const cart = JSON.parse(localStorage.getItem('food-cart') || '[]');
      const cartItem = {
        id: String(product.id),
        title: String(product.name || product.titleEn || product.title || ''),
        price: basePrice + sizeModifier,
        image: String(product.image || (product.images as string[])?.[0] || ''),
        qty,
        variants: [
          { name: 'Size', value: selectedSize },
          { name: 'Spice', value: selectedSpice },
        ],
      };
      const existing = cart.find(
        (c: Record<string, unknown>) =>
          c.id === product.id &&
          (c.variants as Array<Record<string, string>>)?.[0]?.value === selectedSize &&
          (c.variants as Array<Record<string, string>>)?.[1]?.value === selectedSpice
      );
      if (existing) {
        existing.qty += qty;
      } else {
        cart.push(cartItem);
      }
      localStorage.setItem('food-cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart-updated'));
      goto(cartPath);
    } catch { /* ignore */ }
  }
</script>

{#if !product}
  <div class="text-center py-16">
    <p class="text-sm" style="color: {t.textMuted};">Product not found</p>
    <a
      href="/menu"
      class="text-sm font-medium hover:opacity-80 transition-opacity mt-2 inline-block"
      style="color: {t.primaryColor};"
    >
      Back to menu
    </a>
  </div>
{:else}
  <div class="max-w-2xl mx-auto py-8 px-4">
    <div
      class="overflow-hidden"
      style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; box-shadow: {t.shadowCss};"
    >
      <div class="aspect-video" style="background-color: {t.bgColor};">
        {#if (product.images as string[])?.[0] || product.image}
          <img
            src={String((product.images as string[])?.[0] || product.image)}
            alt={String(product.name || '')}
            class="w-full h-full object-cover"
          />
        {:else}
          <div class="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        {/if}
      </div>

      <div class="p-6 space-y-6">
        <div>
          <h1 class="text-2xl font-bold" style="color: {t.textColor};">
            {String(product.name || product.titleEn || product.title || '')}
          </h1>
          <p class="text-sm mt-1" style="color: {t.textMuted};">
            {String(product.description || product.descriptionEn || '')}
          </p>
        </div>

        <div>
          <p class="text-sm font-medium mb-2 block" style="color: {t.textColor};">Size</p>
          <div class="flex gap-2 flex-wrap">
            {#each sizes as size}
              <button
                class="flex-1 min-w-[80px] py-2 px-3 border text-sm font-medium transition-colors"
                style="border-color: {selectedSize === size.id ? t.primaryColor : t.borderColor}; background-color: {selectedSize === size.id ? t.primaryLight : t.cardBg}; color: {selectedSize === size.id ? t.primaryColor : t.textColor}; border-radius: {t.radiusPx};"
                onclick={() => (selectedSize = size.id)}
              >
                {size.label}
                {#if size.priceModifier !== 0}
                  <span class="text-xs ml-1">{size.priceModifier > 0 ? '+' : ''}${size.priceModifier}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <div>
          <p class="text-sm font-medium mb-2 block" style="color: {t.textColor};">Spice Level</p>
          <div class="flex gap-2 flex-wrap">
            {#each spiceLevels as spice}
              <button
                class="flex-1 min-w-[80px] py-2 px-3 border text-sm font-medium transition-colors"
                style="border-color: {selectedSpice === spice.id ? t.primaryColor : t.borderColor}; background-color: {selectedSpice === spice.id ? t.primaryLight : t.cardBg}; color: {selectedSpice === spice.id ? t.primaryColor : t.textColor}; border-radius: {t.radiusPx};"
                onclick={() => (selectedSpice = spice.id)}
              >
                {spice.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="flex items-center gap-4 pt-4 flex-wrap" style="border-top: 1px solid {t.borderColor};">
          <div class="flex items-center gap-2">
            <button
              class="w-8 h-8 flex items-center justify-center transition-colors hover:opacity-80"
              style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
              onclick={() => (qty = Math.max(1, qty - 1))}
              aria-label="Decrease quantity"
            >
              <Minus class="w-4 h-4" style="color: {t.textColor};" />
            </button>
            <span class="w-6 text-center text-sm font-medium" style="color: {t.textColor};">{qty}</span>
            <button
              class="w-8 h-8 flex items-center justify-center transition-colors hover:opacity-80"
              style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
              onclick={() => (qty += 1)}
              aria-label="Increase quantity"
            >
              <Plus class="w-4 h-4" style="color: {t.textColor};" />
            </button>
          </div>

          <button
            onclick={addToCart}
            class="flex-1 min-w-[160px] {btnClasses(t)}"
            style="{btnStyle(t)} border-radius: {t.buttonStyle === 'rounded' ? '9999px' : t.radiusPx};"
          >
            Add to Cart - ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
