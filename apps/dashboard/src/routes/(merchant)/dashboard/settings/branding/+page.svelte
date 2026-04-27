<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Save from '@lucide/svelte/icons/save';
	import Palette from '@lucide/svelte/icons/palette';

	let { data } = $props();
	let saving = $state(false);

	let form = $state({
		activeTheme: data.store?.activeTheme || 'food',
		primaryColor: data.store?.primaryColor || '#0ea5e9',
		secondaryColor: data.store?.secondaryColor || '#64748b',
		accentColor: data.store?.accentColor || '#f59e0b',
		fontFamily: data.store?.fontFamily || 'Inter',
		borderRadius: String(data.store?.borderRadius ?? '8'),
		logoUrl: data.store?.logoUrl || '',
	});

	const themes = [
		{ value: 'food', label: 'Food & Restaurant' },
		{ value: 'clothing', label: 'Clothing & Fashion' },
		{ value: 'appliances', label: 'Electronics & Appliances' },
	];

	const fonts = ['Inter', 'Roboto', 'Outfit', 'Poppins', 'Playfair Display', 'Lora', 'Open Sans', 'Montserrat'];

	async function handleSave() {
		saving = true;
		try {
			await apiFetch('/merchant/store', {
				method: 'PATCH',
				body: JSON.stringify({
					activeTheme: form.activeTheme,
					primaryColor: form.primaryColor,
					secondaryColor: form.secondaryColor,
					accentColor: form.accentColor,
					fontFamily: form.fontFamily,
					borderRadius: Number(form.borderRadius),
					logoUrl: form.logoUrl,
				}),
			});
			toast.success('Branding updated');
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update branding');
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-6 max-w-2xl">
	<!-- Theme Selection -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Palette class="w-5 h-5" />
				Theme
			</CardTitle>
			<CardDescription>Choose the industry theme that best fits your store</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each themes as theme}
					<button
						type="button"
						onclick={() => form.activeTheme = theme.value}
						class="p-4 rounded-lg border-2 text-left transition-all
							{form.activeTheme === theme.value
								? 'border-primary bg-primary/5 ring-2 ring-primary/20'
								: 'border-border hover:border-primary/50'}"
					>
						<p class="font-medium text-sm">{theme.label}</p>
					</button>
				{/each}
			</div>
		</CardContent>
	</Card>

	<!-- Colors -->
	<Card>
		<CardHeader>
			<CardTitle>Brand Colors</CardTitle>
			<CardDescription>Customize your store color scheme</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="space-y-2">
					<Label for="primaryColor">Primary Color</Label>
					<div class="flex gap-2">
						<input type="color" id="primaryColor" bind:value={form.primaryColor} class="h-10 w-14 rounded border cursor-pointer" />
						<Input bind:value={form.primaryColor} class="font-mono text-sm" />
					</div>
				</div>
				<div class="space-y-2">
					<Label for="secondaryColor">Secondary Color</Label>
					<div class="flex gap-2">
						<input type="color" id="secondaryColor" bind:value={form.secondaryColor} class="h-10 w-14 rounded border cursor-pointer" />
						<Input bind:value={form.secondaryColor} class="font-mono text-sm" />
					</div>
				</div>
				<div class="space-y-2">
					<Label for="accentColor">Accent Color</Label>
					<div class="flex gap-2">
						<input type="color" id="accentColor" bind:value={form.accentColor} class="h-10 w-14 rounded border cursor-pointer" />
						<Input bind:value={form.accentColor} class="font-mono text-sm" />
					</div>
				</div>
			</div>

			<!-- Live Preview -->
			<div class="p-4 rounded-lg border bg-muted/30">
				<p class="text-xs text-muted-foreground mb-2">Preview</p>
				<div class="flex gap-2">
					<div class="w-12 h-12 rounded-lg" style="background:{form.primaryColor}"></div>
					<div class="w-12 h-12 rounded-lg" style="background:{form.secondaryColor}"></div>
					<div class="w-12 h-12 rounded-lg" style="background:{form.accentColor}"></div>
				</div>
				<div class="mt-3 flex gap-2">
					<button type="button" class="px-4 py-2 rounded text-white text-sm font-medium" style="background:{form.primaryColor}; border-radius:{form.borderRadius}px">
						Primary Button
					</button>
					<button type="button" class="px-4 py-2 rounded text-white text-sm font-medium" style="background:{form.accentColor}; border-radius:{form.borderRadius}px">
						Accent Button
					</button>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Typography & Radius -->
	<Card>
		<CardHeader>
			<CardTitle>Typography & Shape</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="fontFamily">Font Family</Label>
				<Select.Root type="single" value={form.fontFamily} onValueChange={(v) => form.fontFamily = v}>
					<Select.Trigger class="w-full">
						{#snippet children()}
							{form.fontFamily}
						{/snippet}
					</Select.Trigger>
					<Select.Content>
						{#each fonts as font}
							<Select.Item value={font}>{font}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<Label for="radius">Border Radius ({form.borderRadius}px)</Label>
				<input type="range" id="radius" min="0" max="24" step="1" bind:value={form.borderRadius} class="w-full" />
				<div class="flex justify-between text-xs text-muted-foreground">
					<span>Sharp</span>
					<span>Rounded</span>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Logo -->
	<Card>
		<CardHeader>
			<CardTitle>Logo</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="logoUrl">Logo URL</Label>
				<Input id="logoUrl" bind:value={form.logoUrl} placeholder="https://..." />
			</div>
			{#if form.logoUrl}
				<div class="p-4 rounded-lg border bg-muted/30">
					<img src={form.logoUrl} alt="Store logo" class="max-h-16 object-contain" />
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="flex justify-end">
		<Button type="submit" disabled={saving} class="gap-2">
			<Save class="w-4 h-4" />
			{saving ? 'Saving...' : 'Save Branding'}
		</Button>
	</div>
</form>
