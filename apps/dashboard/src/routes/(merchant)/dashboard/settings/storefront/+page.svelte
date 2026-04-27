<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Save from '@lucide/svelte/icons/save';

	let { data } = $props();
	let saving = $state(false);

	let form = $state({
		heroTitle: data.store?.heroTitle || '',
		heroSubtitle: data.store?.heroSubtitle || '',
		heroImageUrl: data.store?.heroImageUrl || '',
		heroCtaText: data.store?.heroCtaText || 'Shop Now',
		heroCtaUrl: data.store?.heroCtaUrl || '/products',
		showHero: data.store?.showHero ?? true,
		showFeatured: data.store?.showFeatured ?? true,
		showCategories: data.store?.showCategories ?? true,
		showTestimonials: data.store?.showTestimonials ?? false,
		showNewArrivals: data.store?.showNewArrivals ?? true,
		announcementBar: data.store?.announcementBar || '',
		showAnnouncementBar: data.store?.showAnnouncementBar ?? false,
	});

	async function handleSave() {
		saving = true;
		try {
			await apiFetch('/merchant/store', {
				method: 'PATCH',
				body: JSON.stringify(form),
			});
			toast.success('Storefront settings saved');
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to save');
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-6 max-w-2xl">
	<!-- Hero Section -->
	<Card>
		<CardHeader>
			<CardTitle>Hero Section</CardTitle>
			<CardDescription>The main banner on your storefront homepage</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center justify-between">
				<Label for="showHero">Show Hero</Label>
				<Switch id="showHero" bind:checked={form.showHero} />
			</div>
			{#if form.showHero}
				<div class="space-y-2">
					<Label for="heroTitle">Hero Title</Label>
					<Input id="heroTitle" bind:value={form.heroTitle} placeholder="Welcome to our store" />
				</div>
				<div class="space-y-2">
					<Label for="heroSubtitle">Hero Subtitle</Label>
					<Textarea id="heroSubtitle" bind:value={form.heroSubtitle} placeholder="Discover amazing products..." rows={2} />
				</div>
				<div class="space-y-2">
					<Label for="heroImage">Hero Image URL</Label>
					<Input id="heroImage" bind:value={form.heroImageUrl} placeholder="https://..." />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="ctaText">CTA Button Text</Label>
						<Input id="ctaText" bind:value={form.heroCtaText} />
					</div>
					<div class="space-y-2">
						<Label for="ctaUrl">CTA Button URL</Label>
						<Input id="ctaUrl" bind:value={form.heroCtaUrl} />
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Homepage Sections -->
	<Card>
		<CardHeader>
			<CardTitle>Homepage Sections</CardTitle>
			<CardDescription>Toggle visibility of homepage sections</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<Label>Featured Products</Label>
					<p class="text-sm text-muted-foreground">Show highlighted products</p>
				</div>
				<Switch bind:checked={form.showFeatured} />
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div>
					<Label>Categories</Label>
					<p class="text-sm text-muted-foreground">Show category browsing grid</p>
				</div>
				<Switch bind:checked={form.showCategories} />
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div>
					<Label>New Arrivals</Label>
					<p class="text-sm text-muted-foreground">Show recently added products</p>
				</div>
				<Switch bind:checked={form.showNewArrivals} />
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div>
					<Label>Testimonials</Label>
					<p class="text-sm text-muted-foreground">Show customer testimonials</p>
				</div>
				<Switch bind:checked={form.showTestimonials} />
			</div>
		</CardContent>
	</Card>

	<!-- Announcement Bar -->
	<Card>
		<CardHeader>
			<CardTitle>Announcement Bar</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center justify-between">
				<Label for="showAnnouncement">Show Announcement Bar</Label>
				<Switch id="showAnnouncement" bind:checked={form.showAnnouncementBar} />
			</div>
			{#if form.showAnnouncementBar}
				<div class="space-y-2">
					<Label for="announcement">Announcement Text</Label>
					<Input id="announcement" bind:value={form.announcementBar} placeholder="Free shipping on orders over $50!" />
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="flex justify-end">
		<Button type="submit" disabled={saving} class="gap-2">
			<Save class="w-4 h-4" />
			{saving ? 'Saving...' : 'Save Storefront'}
		</Button>
	</div>
</form>
