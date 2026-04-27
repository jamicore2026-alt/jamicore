<script lang="ts">
  import type { PageData } from './$types.js';
  import { formatPrice, parseImages } from '$lib/utils/format.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Heart, ShoppingCart, Trash2 } from '@lucide/svelte';
  import { getCookie } from '$lib/api/client.js';

  let { data }: { data: PageData } = $props();

  let wishlist = $state(data.wishlist);
  let removing = $state<Set<string>>(new Set());

  async function removeFromWishlist(productId: string) {
    removing.add(productId);
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch(`/api/v1/customer/wishlist/${productId}`, {
        method: 'DELETE',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        credentials: 'include',
      });
      if (res.ok) {
        wishlist = wishlist.filter((w: any) => w.productId !== productId);
      }
    } catch {
      // failed
    } finally {
      removing.delete(productId);
    }
  }
</script>

<svelte:head>
  <title>Wishlist | My Account</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold text-[var(--color-text)] mb-6">Wishlist</h1>

  {#if wishlist.length === 0}
    <div class="text-center py-16">
      <Heart class="size-16 mx-auto text-[var(--color-text-secondary)] mb-4" />
      <p class="text-lg text-[var(--color-text-secondary)]">Your wishlist is empty</p>
      <a href="/products">
        <Button class="mt-4">Browse Products</Button>
      </a>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each wishlist as item (item.id)}
        {@const product = item.product}
        {@const images = product ? parseImages(product.images) : []}
        <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden {removing.has(item.productId) ? 'opacity-60' : ''}">
          <a href="/products/{item.productId}">
            <div class="aspect-[4/3] bg-[var(--color-bg)] overflow-hidden">
              {#if images.length > 0}
                <img src={images[0]} alt={product?.titleEn ?? ''} class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              {:else}
                <div class="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs">No image</div>
              {/if}
            </div>
          </a>
          <div class="p-4">
            <a href="/products/{item.productId}" class="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] line-clamp-1">
              {product?.titleEn ?? 'Product'}
            </a>
            <div class="flex items-center justify-between mt-2">
              <span class="text-sm font-semibold text-[var(--color-primary)]">
                {product ? formatPrice(product.salePrice) : ''}
              </span>
              <div class="flex items-center gap-1">
                <a href="/products/{item.productId}">
                  <Button variant="ghost" size="icon" class="size-8">
                    <ShoppingCart class="size-4" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                  onclick={() => removeFromWishlist(item.productId)}
                  disabled={removing.has(item.productId)}
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>