<script lang="ts">
	import type { ProductListItem } from '@repo/shared-types';
	import { Heart, GitCompare } from '@lucide/svelte';
	import { formatPrice, parseImages, parseTags, calcDiscountedPrice, discountLabel, getOptimizedUrl, getSrcset } from '$lib/utils/format.js';
	import { cn } from '$lib/utils.js';
	import { getCookie } from '$lib/api/client.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { compareStore } from '$lib/stores/compare.svelte';

	interface Props {
		product: ProductListItem;
		showAddToCart?: boolean;
		showDiscountBadge?: boolean;
	}

	let { product, showAddToCart = true, showDiscountBadge = true }: Props = $props();

	let images = $derived(parseImages(product.images));
	let tags = $derived(parseTags(product.tags));
	let hasDiscount = $derived(parseFloat(product.discount) > 0);
	let finalPrice = $derived(calcDiscountedPrice(product.salePrice, product.discountType, product.discount));
	let label = $derived(discountLabel(product.discountType, product.discount));

	let wishlisted = $state(false);
	let toggling = $state(false);

	async function toggleWishlist(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const token = getCookie('access_token');
		if (!token) {
			goto('/login');
			return;
		}
		if (toggling) return;
		toggling = true;
		try {
			if (wishlisted) {
				const res = await fetch(`/api/v1/customer/wishlist/${product.id}`, {
					method: 'DELETE',
					credentials: 'include',
					headers: { 'X-CSRF-Token': getCookie('csrf_token') || '' },
				});
				if (res.ok) {
					wishlisted = false;
					toast.success('Removed from wishlist');
				}
			} else {
				const res = await fetch('/api/v1/customer/wishlist', {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-Token': getCookie('csrf_token') || '',
					},
					body: JSON.stringify({ productId: product.id }),
				});
				if (res.ok || res.status === 409) {
					wishlisted = true;
					toast.success('Added to wishlist');
				}
			}
		} catch {
			toast.error('Failed to update wishlist');
		} finally {
			toggling = false;
		}
	}
</script>

<a
	href="/products/{product.id}"
	class="group block overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 ease-out hover:border-[var(--color-primary)]/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
	aria-label="View {product.titleEn}"
>
	<!-- Image area: landscape 4:3 -->
	<div class="relative aspect-[4/3] overflow-hidden bg-[var(--color-bg)]">
		{#if images.length > 0}
			<picture class="block w-full h-full">
				<source
					srcset="{getOptimizedUrl(images[0], 'avif')}"
					type="image/avif"
				/>
				<source
					srcset="{getSrcset(images[0], 'webp')}"
					type="image/webp"
				/>
				<img
					src={images[0]}
					alt={product.titleEn}
					class="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
					loading="lazy"
					decoding="async"
				/>
			</picture>
		{:else}
			<div class="h-full w-full flex items-center justify-center">
				<span class="text-[var(--color-text-secondary)] text-sm">No image</span>
			</div>
		{/if}

		<!-- Discount badge -->
		{#if hasDiscount && showDiscountBadge && label}
			<span
				class="absolute top-2 left-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-white"
				aria-label="Discount {label}"
			>
				{label}
			</span>
		{/if}

		<!-- Wishlist heart — top-right -->
		<button
			type="button"
			class="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-[var(--color-surface)]/80 backdrop-blur-sm transition-colors hover:bg-[var(--color-surface)] disabled:opacity-50"
			aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
			disabled={toggling}
			onclick={toggleWishlist}
		>
			<Heart
				class={cn(
					'size-4 transition-colors',
					wishlisted ? 'fill-[var(--color-error)] text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'
				)}
			/>
		</button>

		<!-- Compare toggle — below wishlist -->
		<button
			type="button"
			class="absolute top-12 right-2 flex size-8 items-center justify-center rounded-full bg-[var(--color-surface)]/80 backdrop-blur-sm transition-colors hover:bg-[var(--color-surface)]"
			aria-label={compareStore.isSelected(product.id) ? 'Remove from comparison' : 'Add to comparison'}
			onclick={(e) => { e.preventDefault(); e.stopPropagation(); compareStore.toggle(product); }}
		>
			<GitCompare
				class={cn(
					'size-4 transition-colors',
					compareStore.isSelected(product.id) ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
				)}
			/>
		</button>
	</div>

	<!-- Content -->
	<div class="flex flex-col gap-2 p-3 sm:p-4">
		<!-- Category -->
		{#if product.category?.nameEn}
			<p class="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-medium">
				{product.category.nameEn}
			</p>
		{/if}

		<!-- Product name -->
		<h3 class="text-sm font-semibold text-[var(--color-text)] leading-tight line-clamp-2">
			{product.titleEn}
		</h3>

		<!-- Spec tags -->
		{#if tags.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each tags.slice(0, 3) as tag}
					<span class="inline-block rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)]">
						{tag}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Price row -->
		<div class="flex items-baseline gap-2 pt-1">
			<span class="text-base font-bold text-[var(--color-primary)]">
				{formatPrice(finalPrice)}
			</span>
			{#if hasDiscount}
				<span class="text-xs text-[var(--color-text-secondary)] line-through">
					{formatPrice(product.salePrice)}
				</span>
			{/if}
		</div>
	</div>
</a>
