<script lang="ts">
	import type { ProductListItem } from '@repo/shared-types';
	import { Heart } from '@lucide/svelte';
	import { formatPrice, parseImages, calcDiscountedPrice, getOptimizedUrl, getSrcset } from '$lib/utils/format.js';
	import { cn } from '$lib/utils.js';
	import { getCookie } from '$lib/api/client.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	interface Props {
		product: ProductListItem;
		showAddToCart?: boolean;
		showDiscountBadge?: boolean;
	}

	let { product, showAddToCart = false, showDiscountBadge = false }: Props = $props();

	let images = $derived(parseImages(product.images));
		let hasDiscount = $derived(parseFloat(product.discount) > 0);
	let finalPrice = $derived(calcDiscountedPrice(product.salePrice, product.discountType, product.discount));

	let wishlisted = $state(false);
	let toggling = $state(false);
	let hovered = $state(false);
	let visible = $state(false);

	// Trigger fade-in animation on mount
	$effect(() => {
		const id = requestAnimationFrame(() => { visible = true; });
		return () => cancelAnimationFrame(id);
	});

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
	class="group block overflow-hidden rounded-[2px] bg-transparent transition-all duration-300 ease-out hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
	class:opacity-0={!visible}
	class:opacity-100={visible}
	class:translate-y-2={!visible}
	class:translate-y-0={visible}
	aria-label="View {product.titleEn}"
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
>
	<!-- Image area: portrait 3:4 -->
	<div class="relative aspect-[3/4] overflow-hidden bg-[var(--color-border)]">
		{#if images.length > 0}
			<!-- Primary image -->
			<picture class={cn(
				'absolute inset-0 block h-full w-full',
				hovered && images.length > 1 ? 'opacity-0' : 'opacity-100'
			)}>
				<source srcset="{getOptimizedUrl(images[0], 'avif')}" type="image/avif" />
				<source srcset="{getSrcset(images[0], 'webp')}" type="image/webp" />
				<img
					src={images[0]}
					alt={product.titleEn}
					class="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
					loading="lazy"
					decoding="async"
				/>
			</picture>
			<!-- Secondary image — crossfade on hover -->
			{#if images.length > 1}
				<picture class={cn(
					'absolute inset-0 block h-full w-full',
					hovered ? 'opacity-100' : 'opacity-0'
				)}>
					<source srcset="{getOptimizedUrl(images[1], 'avif')}" type="image/avif" />
					<source srcset="{getSrcset(images[1], 'webp')}" type="image/webp" />
					<img
						src={images[1]}
						alt="{product.titleEn} alternate view"
						class="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
						loading="lazy"
						decoding="async"
					/>
				</picture>
			{/if}
		{:else}
			<div class="h-full w-full flex items-center justify-center">
				<span class="text-[var(--color-text-secondary)] text-sm">No image</span>
			</div>
		{/if}

		<!-- Wishlist heart — top-left with backdrop blur -->
		<button
			type="button"
			class="absolute top-3 left-3 flex size-9 items-center justify-center rounded-full bg-white/40 backdrop-blur-md transition-colors hover:bg-white/60 disabled:opacity-50"
			aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
			disabled={toggling}
			onclick={toggleWishlist}
		>
			<Heart
				class={cn(
					'size-4 transition-colors',
					wishlisted ? 'fill-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text)]'
				)}
			/>
		</button>
	</div>

	<!-- Content: minimal, editorial -->
	<div class="flex flex-col gap-1.5 pt-3 pb-1">
		<!-- Product name — serif-style weight for editorial feel -->
		<h3 class="text-base font-light text-[var(--color-text)] leading-snug tracking-wide line-clamp-1">
			{product.titleEn}
		</h3>

		<!-- Variant color dots placeholder -->
		<div class="flex items-center gap-1.5">
			<span class="size-2.5 rounded-full bg-[var(--color-text)]" aria-hidden="true"></span>
			<span class="size-2.5 rounded-full bg-[var(--color-text-secondary)]" aria-hidden="true"></span>
			<span class="size-2.5 rounded-full bg-[var(--color-accent)]" aria-hidden="true"></span>
		</div>

		<!-- Price: clean, no badge clutter; discount shown as subtle strikethrough -->
		<div class="flex items-baseline gap-2 mt-0.5">
			<span class="text-sm font-normal text-[var(--color-text)]">
				{formatPrice(hasDiscount ? finalPrice : parseFloat(product.salePrice))}
			</span>
			{#if hasDiscount}
				<span class="text-xs text-[var(--color-text-secondary)] line-through">
					{formatPrice(product.salePrice)}
				</span>
			{/if}
		</div>
	</div>
</a>
