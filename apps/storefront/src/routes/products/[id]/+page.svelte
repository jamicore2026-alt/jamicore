<script lang="ts">
  import type { PageData } from './$types.js';
  import ImageGallery from '$lib/components/product/ImageGallery.svelte';
  import VariantSelector from '$lib/components/product/VariantSelector.svelte';
  import ModifierSelector from '$lib/components/product/ModifierSelector.svelte';
  import ProductReviews from '$lib/components/product/ProductReviews.svelte';
  import StickyAddToCart from '$lib/components/product/StickyAddToCart.svelte';
  import ProductGrid from '$lib/components/product/ProductGrid.svelte';
  import { formatPrice, parseImages, calcDiscountedPrice, discountLabel } from '$lib/utils/format.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Clock, Package, ShoppingCart, Share2, Link2 } from '@lucide/svelte';
  import { addToCart } from '$lib/stores/cart.svelte';
  import SeoMeta from '$lib/components/SeoMeta.svelte';

  let { data }: { data: PageData } = $props();

  const product = $derived(data.product);
  const images = $derived(parseImages(product.images));
  const hasDiscount = $derived(parseFloat(product.discount) > 0);
  const discountedPrice = $derived(hasDiscount
    ? calcDiscountedPrice(product.salePrice, product.discountType, product.discount)
    : parseFloat(product.salePrice));
  const discLabel = $derived(hasDiscount ? discountLabel(product.discountType, product.discount) : '');
  const themeType = $derived(data.themeType ?? 'appliances');

  // JSON-LD structured data (split <script> tag to avoid parser confusion)
  const jsonLdHtml = $derived(
    '<' + 'script type="application/ld+json">' + JSON.stringify(data.jsonLd) + '</' + 'script>',
  );

  // Selected variant/modifier state
  let selectedVariantOptionIds = $state<string[]>([]);
  let selectedCombinationKey = $state<string>('');
  let selectedModifierOptionIds = $state<string[]>([]);
  let quantity = $state(1);

  // Bundle state
  let addingBundle = $state<string | null>(null);

  async function addBundleToCart(bundleId: string) {
    addingBundle = bundleId;
    try {
      await addToCart(product.id, 1, bundleId);
    } catch {
      // failed
    } finally {
      addingBundle = null;
    }
  }

  // Compute effective price based on selections
  let effectivePrice = $derived.by(() => {
    let price = discountedPrice;
    // Add variant price adjustments (simplified: sum of selected options)
    if (product.variants) {
      for (const variant of product.variants) {
        for (const option of variant.options) {
          if (selectedVariantOptionIds.includes(option.id)) {
            price += parseFloat(option.priceAdjustment);
          }
        }
      }
    }
    // Add modifier price adjustments
    if (product.modifierGroups) {
      for (const group of product.modifierGroups) {
        for (const option of group.options) {
          if (selectedModifierOptionIds.includes(option.id)) {
            price += parseFloat(option.priceAdjustment);
          }
        }
      }
    }
    return price * quantity;
  });

  let shareUrl = $derived(typeof window !== 'undefined' ? window.location.href : '');

  function copyLink() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareUrl);
    }
  }

  function shareTwitter() {
    const text = encodeURIComponent(product.titleEn);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }

  function shareFacebook() {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`${product.titleEn} - ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
</script>

<SeoMeta
  title="{product.titleEn} | {data.store?.name ?? 'Store'}"
  description={product.descriptionEn ?? product.titleEn}
  image={images[0] ?? ''}
  canonical={shareUrl}
  type="product"
/>

<svelte:head>
  {@html jsonLdHtml}
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pb-8 pb-24">
  <div class="lg:grid lg:grid-cols-2 lg:gap-12">
    <!-- Image gallery -->
    <ImageGallery images={images} title={product.titleEn} />

    <!-- Product info -->
    <div class="mt-6 lg:mt-0">
      <div class="flex items-start justify-between">
        <div>
          {#if product.category}
            <a
              href="/categories/{product.category.id}"
              class="text-sm text-[var(--color-primary)] hover:underline"
            >
              {product.category.nameEn}
            </a>
          {/if}
          <h1 class="text-3xl font-bold text-[var(--color-text)] mt-1">{product.titleEn}</h1>
        </div>
        {#if hasDiscount && discLabel}
          <Badge variant="destructive" class="text-sm">{discLabel}</Badge>
        {/if}
      </div>

      <!-- Price -->
      <div class="mt-4 flex items-baseline gap-3">
        <span class="text-3xl font-bold text-[var(--color-primary)]">
          {formatPrice(effectivePrice.toFixed(2))}
        </span>
        {#if hasDiscount}
          <span class="text-lg text-[var(--color-text-secondary)] line-through">
            {formatPrice(product.salePrice)}
          </span>
        {/if}
      </div>

      <!-- Social share -->
      <div class="mt-3 flex items-center gap-2">
        <span class="text-xs text-[var(--color-text-secondary)] mr-1">Share:</span>
        <button
          class="p-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
          onclick={copyLink}
          aria-label="Copy link"
          title="Copy link"
        >
          <Link2 class="size-3.5" />
        </button>
        <button
          class="p-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[#1DA1F2] hover:text-white transition-colors"
          onclick={shareTwitter}
          aria-label="Share on Twitter"
          title="Share on Twitter"
        >
          <Share2 class="size-3.5" />
        </button>
        <button
          class="p-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[#1877F2] hover:text-white transition-colors"
          onclick={shareFacebook}
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <Share2 class="size-3.5" />
        </button>
        <button
          class="p-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[#25D366] hover:text-white transition-colors"
          onclick={shareWhatsApp}
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
        >
          <Share2 class="size-3.5" />
        </button>
      </div>

      <!-- Meta badges -->
      <div class="mt-3 flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
        {#if product.preparationTime}
          <span class="flex items-center gap-1">
            <Clock class="size-4" />
            {product.preparationTime} min
          </span>
        {/if}
        <span class="flex items-center gap-1">
          <Package class="size-4" />
          {product.currentQuantity > 0 ? `${product.currentQuantity} in stock` : 'Out of stock'}
        </span>
        {#if data.reviewAvg > 0}
          <span>{data.reviewAvg.toFixed(1)} ({data.reviewTotal} reviews)</span>
        {/if}
      </div>

      <!-- Description -->
      {#if product.descriptionEn}
        <div class="mt-6 prose text-[var(--color-text-secondary)]">
          {product.descriptionEn}
        </div>
      {/if}

      <!-- Bundles -->
      {#if data.bundles && data.bundles.length > 0}
        <div class="mt-6 space-y-3">
          <h3 class="text-sm font-semibold text-[var(--color-text)]">Buy as Bundle</h3>
          {#each data.bundles as bundle (bundle.id)}
            <div class="border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 bg-[var(--color-surface)]">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1">
                  <p class="text-sm font-semibold text-[var(--color-text)]">{bundle.name}</p>
                  <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {bundle.items?.length ?? 0} items
                  </p>
                  <div class="mt-2 space-y-1">
                    {#each bundle.items ?? [] as bi (bi.id)}
                      <p class="text-xs text-[var(--color-text-secondary)] truncate">
                        {bi.product?.titleEn ?? 'Product'} × {bi.quantity}
                      </p>
                    {/each}
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-base font-bold text-[var(--color-primary)]">{formatPrice(bundle.price)}</p>
                  <Button
                    size="sm"
                    class="mt-2"
                    disabled={addingBundle === bundle.id}
                    onclick={() => addBundleToCart(bundle.id)}
                  >
                    <ShoppingCart class="size-3.5 mr-1" />
                    {addingBundle === bundle.id ? 'Adding...' : 'Add Bundle'}
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Variants -->
      {#if product.variants && product.variants.length > 0}
        <div class="mt-6 space-y-4">
          {#each product.variants as variant}
            <VariantSelector
              {variant}
              selectedIds={selectedVariantOptionIds}
              onSelect={(ids) => (selectedVariantOptionIds = ids)}
            />
          {/each}
        </div>
      {/if}

      <!-- Modifiers -->
      {#if product.modifierGroups && product.modifierGroups.length > 0}
        <div class="mt-6 space-y-4">
          {#each product.modifierGroups as group}
            <ModifierSelector
              {group}
              selectedIds={selectedModifierOptionIds}
              onSelect={(ids) => (selectedModifierOptionIds = ids)}
            />
          {/each}
        </div>
      {/if}

      <!-- Quantity + Add to Cart (desktop) -->
      <div class="mt-6 hidden lg:block">
        <StickyAddToCart
          productId={product.id}
          price={formatPrice(effectivePrice.toFixed(2))}
          {quantity}
          onQuantityChange={(q) => (quantity = q)}
          variantOptionIds={selectedVariantOptionIds}
          combinationKey={selectedCombinationKey}
          modifierOptionIds={selectedModifierOptionIds}
          inStock={product.currentQuantity > 0}
        />
      </div>
    </div>
  </div>

  <!-- Reviews -->
  <div class="mt-16">
    <ProductReviews
      reviews={data.reviews}
      reviewAvg={data.reviewAvg}
      reviewTotal={data.reviewTotal}
      productId={product.id}
      isLoggedIn={data.isLoggedIn}
    />
  </div>

  <!-- Related products -->
  {#if data.relatedProducts.length > 0}
    <div class="mt-16">
      <h2 class="text-2xl font-bold text-[var(--color-text)] mb-6">You May Also Like</h2>
      <ProductGrid products={data.relatedProducts} {themeType} columns={4} />
    </div>
  {/if}
</div>

<!-- Mobile sticky add to cart bar -->
<div class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-3">
  <StickyAddToCart
    productId={product.id}
    price={formatPrice(effectivePrice.toFixed(2))}
    {quantity}
    onQuantityChange={(q) => (quantity = q)}
    variantOptionIds={selectedVariantOptionIds}
    combinationKey={selectedCombinationKey}
    modifierOptionIds={selectedModifierOptionIds}
    inStock={product.currentQuantity > 0}
    mobile={true}
  />
</div>