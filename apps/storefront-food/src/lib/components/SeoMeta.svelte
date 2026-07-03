<script lang="ts">
	// P1-E(#45): SEO meta parity with apps/storefront. Mirrors storefront's
	// SeoMeta.svelte and adds an optional `noindex` prop for transactional pages
	// (cart/checkout) that should not be indexed.
	interface Props {
		title: string;
		description?: string;
		image?: string;
		canonical?: string;
		type?: string;
		noindex?: boolean;
	}

	let {
		title,
		description = '',
		image = '',
		canonical = '',
		type = 'website',
		noindex = false,
	}: Props = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
	{#if canonical}
		<link rel="canonical" href={canonical} />
	{/if}

	<!-- Open Graph -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	{#if image}
		<meta property="og:image" content={image} />
	{/if}
	{#if canonical}
		<meta property="og:url" content={canonical} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if image}
		<meta name="twitter:image" content={image} />
	{/if}
</svelte:head>