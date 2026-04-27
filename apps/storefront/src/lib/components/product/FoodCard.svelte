<script lang="ts">
	import type { ProductListItem } from '@repo/shared-types';
	import { Heart, Clock } from '@lucide/svelte';
	import { formatPrice, parseImages, calcDiscountedPrice, discountLabel, getOptimizedUrl, getSrcset } from '$lib/utils/format.js';
	import { cn } from '$lib/utils.js';
	import { getCookie } from '$lib/api/client.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	interface Props {
		product: ProductListItem;
		showAddToCart?: boolean;
		showDiscountBadge?: boolean;
	}

	let { product, showAddToCart = true, showDiscountBadge = true }: Props = $props();

	let images = $derived(parseImages(product.images));
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
	class="group block overflow-hidden rounded-[var(--radius-base)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-all duration-200 ease-out hover:shadow-lg hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
	aria-label="View {product.titleEn}"
>
	<!-- Image area: square/landscape -->
	<div class="relative aspect-square overflow-hidden">
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
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
					loading="lazy"
					decoding="async"
				/>
			</picture>
		{:else}
			<div class="h-full w-full bg-[var(--color-border)] flex items-center justify-center">
				<span class="text-[var(--color-text-secondary)] text-sm">No image</span>
			</div>
		{/if}

		<!-- Discount badge — top-left -->
		{#if hasDiscount && showDiscountBadge && label}
			<span
				class="absolute top-2 left-2 rounded-[var(--radius-base)] bg-[var(--color-error)] px-2 py-0.5 text-xs font-bold text-white"
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
	</div>

	<!-- Content area -->
	<div class="flex flex-col gap-2 p-3">
		<!-- Category -->
		<span class="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">
			{product.category.nameEn}
		</span>

		<!-- Product name -->
		<h3 class="text-sm font-medium text-[var(--color-text)] leading-tight line-clamp-2">
			{product.titleEn}
		</h3>

		<!-- Preparation time badge -->
		{#if product.preparationTime != null}
			<span class="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
				<Clock class="size-3.5" />
				{product.preparationTime} min
			</span>
		{/if}

		<!-- Price row -->
		<div class="flex items-baseline gap-2 mt-auto">
			<span class="text-base font-bold text-[var(--color-primary)]">
				{formatPrice(finalPrice)}
			</span>
			{#if hasDiscount}
				<span class="text-xs text-[var(--color-text-secondary)] line-through">
					{formatPrice(product.salePrice)}
				</span>
			{/if}
		</div>

		<!-- Order Now button -->
		{#if showAddToCart}
			<span
				class="mt-1 block w-full rounded-[var(--radius-base)] bg-[var(--color-primary)] px-3 py-2 text-center text-xs font-semibold text-white transition-opacity group-hover:opacity-90"
				role="button"
				aria-label="Order {product.titleEn}"
			>
				Order Now
			</span>
		{/if}
	</div>
</a>
