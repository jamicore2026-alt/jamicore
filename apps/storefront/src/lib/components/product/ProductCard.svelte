<script lang="ts">
	import type { ProductListItem } from '@repo/shared-types';
	import type { ThemeType } from '@repo/ui/themes';
	import FoodCard from './FoodCard.svelte';
	import LookbookCard from './LookbookCard.svelte';
	import SpecCard from './SpecCard.svelte';

	interface Props {
		product: ProductListItem;
		themeType?: ThemeType;
		showAddToCart?: boolean;
		showDiscountBadge?: boolean;
	}

	let {
		product,
		themeType = 'appliances',
		showAddToCart = true,
		showDiscountBadge = true
	}: Props = $props();
</script>

{#if themeType === 'food'}
	<FoodCard {product} {showAddToCart} {showDiscountBadge} />
{:else if themeType === 'clothing'}
	<LookbookCard {product} />
{:else}
	<SpecCard {product} {showDiscountBadge} />
{/if}