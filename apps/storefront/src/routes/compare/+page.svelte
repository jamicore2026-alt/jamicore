<script lang="ts">
  import { compareStore } from '$lib/stores/compare.svelte';
  import { formatPrice, parseImages, calcDiscountedPrice, parseTags } from '$lib/utils/format.js';
  import { X, ArrowLeft, GitCompare } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  function removeItem(id: string) {
    compareStore.remove(id);
  }

  function clearAll() {
    compareStore.clear();
  }

  const features = [
    { label: 'Image', key: 'image' },
    { label: 'Price', key: 'price' },
    { label: 'Discount', key: 'discount' },
    { label: 'Category', key: 'category' },
    { label: 'Preparation Time', key: 'preparationTime' },
    { label: 'Tags', key: 'tags' },
  ];
</script>

<svelte:head>
  <title>Compare Products</title>
  <meta name="description" content="Compare products side by side">
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="flex items-center gap-4 mb-6">
    <button
      type="button"
      class="p-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
      onclick={() => goto('/products')}
      aria-label="Back to products"
    >
      <ArrowLeft class="size-5 text-[var(--color-text)]" />
    </button>
    <div>
      <h1 class="text-2xl font-bold text-[var(--color-text)]">Compare Products</h1>
      <p class="text-sm text-[var(--color-text-secondary)]">
        {compareStore.items.length} product{compareStore.items.length !== 1 ? 's' : ''} selected
      </p>
    </div>
    {#if compareStore.items.length > 0}
      <button
        type="button"
        class="ml-auto text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
        onclick={clearAll}
      >
        Clear all
      </button>
    {/if}
  </div>

  {#if compareStore.items.length === 0}
    <div class="text-center py-20">
      <GitCompare class="size-12 mx-auto text-[var(--color-text-secondary)] mb-4" />
      <p class="text-lg font-medium text-[var(--color-text)]">No products to compare</p>
      <p class="text-sm text-[var(--color-text-secondary)] mt-1">
        Add products to comparison from the product listing or detail pages.
      </p>
      <button
        type="button"
        class="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
        onclick={() => goto('/products')}
      >
        Browse Products
      </button>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <div class="min-w-[600px]">
        <!-- Header row with product cards -->
        <div class="grid gap-4" style="grid-template-columns: 140px repeat({compareStore.items.length}, 1fr)">
          <div class="text-sm font-medium text-[var(--color-text-secondary)]"></div>
          {#each compareStore.items as item (item.id)}
            {@const imgs = parseImages(item.images)}
            <div class="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
              <button
                type="button"
                class="absolute top-2 right-2 p-1 rounded-full hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text-secondary)]"
                onclick={() => removeItem(item.id)}
                aria-label="Remove {item.titleEn}"
              >
                <X class="size-4" />
              </button>
              {#if imgs.length > 0}
                <img
                  src={imgs[0]}
                  alt={item.titleEn}
                  class="w-full aspect-square object-cover rounded-[var(--radius-base)] mb-3"
                />
              {:else}
                <div class="w-full aspect-square bg-[var(--color-border)] rounded-[var(--radius-base)] mb-3 flex items-center justify-center">
                  <span class="text-xs text-[var(--color-text-secondary)]">No image</span>
                </div>
              {/if}
              <a
                href="/products/{item.id}"
                class="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors line-clamp-2"
              >
                {item.titleEn}
              </a>
            </div>
          {/each}
        </div>

        <!-- Feature rows -->
        {#each features as feature}
          <div
            class="grid gap-4 mt-4 border-t border-[var(--color-border)] pt-4"
            style="grid-template-columns: 140px repeat({compareStore.items.length}, 1fr)"
          >
            <div class="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              {feature.label}
            </div>
            {#each compareStore.items as item (item.id)}
              <div class="text-sm text-[var(--color-text)]">
                {#if feature.key === 'image'}
                  <span class="text-[var(--color-text-secondary)]">—</span>
                {:else if feature.key === 'price'}
                  {@const final = calcDiscountedPrice(item.salePrice, item.discountType, item.discount)}
                  <span class="font-semibold text-[var(--color-primary)]">{formatPrice(final)}</span>
                  {#if parseFloat(item.discount) > 0}
                    <span class="text-xs text-[var(--color-text-secondary)] line-through ml-1">{formatPrice(item.salePrice)}</span>
                  {/if}
                {:else if feature.key === 'discount'}
                  {#if parseFloat(item.discount) > 0}
                    {item.discountType === 'Percent' ? `${item.discount}%` : formatPrice(item.discount)} off
                  {:else}
                    <span class="text-[var(--color-text-secondary)]">None</span>
                  {/if}
                {:else if feature.key === 'category'}
                  {item.category?.nameEn || '—'}
                {:else if feature.key === 'preparationTime'}
                  {item.preparationTime != null ? `${item.preparationTime} min` : '—'}
                {:else if feature.key === 'tags'}
                  {@const tags = parseTags(item.tags)}
                  {#if tags.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each tags.slice(0, 4) as tag}
                        <span class="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-bg)] border border-[var(--color-border)]">{tag}</span>
                      {/each}
                    </div>
                  {:else}
                    <span class="text-[var(--color-text-secondary)]">—</span>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
