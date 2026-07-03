<script lang="ts">
	// P1-E(#46): frontend (al-ektefa-group) had per-page <title>+<description> only —
	// no OG/Twitter/canonical, and app.html had a hardcoded <title> colliding with
	// each route's <title> (duplicate <title> in <head>). This component centralizes
	// title/description/OG/Twitter/canonical and absolutizes image+canonical via the
	// request origin (OG images must be absolute URLs).
	import { page } from '$app/state';

	interface Props {
		title: string;
		description?: string;
		image?: string;
		canonical?: string;
		type?: string;
	}

	let {
		title,
		description = '',
		image = '',
		canonical = '',
		type = 'website',
	}: Props = $props();

	const origin = $derived(page.url.origin);
	const href = $derived(canonical || `${origin}${page.url.pathname}`);
	const img = $derived(
		image ? (image.startsWith('http') ? image : `${origin}${image}`) : ''
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={href} />

	<!-- Open Graph -->
	<meta property="og:site_name" content="Al-Ektefa Group" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={href} />
	{#if img}
		<meta property="og:image" content={img} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if img}
		<meta name="twitter:image" content={img} />
	{/if}
</svelte:head>