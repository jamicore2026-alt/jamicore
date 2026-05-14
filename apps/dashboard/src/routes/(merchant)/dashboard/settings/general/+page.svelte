<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
		import * as Select from '$lib/components/ui/select';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Save from '@lucide/svelte/icons/save';

	let { data } = $props();
	let saving = $state(false);
		// svelte-ignore state_referenced_locally
	let { store } = data;

	let form = $state({
		name: store?.name || '',
		domain: store?.domain || '',
		ownerEmail: store?.ownerEmail || '',
		ownerPhone: store?.ownerPhone || '',
		currency: store?.currency || 'USD',
		timezone: store?.timezone || 'UTC',
		language: store?.language || 'en',
		storeType: store?.storeType || 'general',
	});

	const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'INR'];

	async function handleSave() {
		saving = true;
		try {
			await apiFetch('/merchant/store', {
				method: 'PATCH',
				body: JSON.stringify(form),
			});
			toast.success('Settings saved');
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to save settings');
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-6 max-w-2xl">
	<Card>
		<CardHeader>
			<CardTitle>Store Information</CardTitle>
			<CardDescription>Basic details about your store</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Store Name</Label>
				<Input id="name" bind:value={form.name} placeholder="My Store" />
			</div>
			<div class="space-y-2">
				<Label for="domain">Domain / Subdomain</Label>
				<Input id="domain" bind:value={form.domain} placeholder="mystore" />
				<p class="text-xs text-muted-foreground">Your store will be accessible at {form.domain}.yourdomain.com</p>
			</div>
			<div class="space-y-2">
				<Label for="storeType">Store Type</Label>
				<Select.Root type="single" value={form.storeType} onValueChange={(v) => form.storeType = v}>
					<Select.Trigger class="w-full">
						{form.storeType === 'general' ? 'General E-Commerce' : 'Food / Restaurant'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="general">General E-Commerce</Select.Item>
						<Select.Item value="food">Food / Restaurant</Select.Item>
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">Changes the storefront theme and dashboard labels</p>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Contact Information</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="email">Owner Email</Label>
				<Input id="email" type="email" bind:value={form.ownerEmail} />
			</div>
			<div class="space-y-2">
				<Label for="phone">Phone</Label>
				<Input id="phone" bind:value={form.ownerPhone} placeholder="+1 234 567 8900" />
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Regional Settings</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="currency">Currency</Label>
				<Select.Root type="single" value={form.currency} onValueChange={(v) => form.currency = v}>
					<Select.Trigger class="w-full">
						{form.currency}
					</Select.Trigger>
					<Select.Content>
						{#each currencies as c}
							<Select.Item value={c}>{c}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<Label for="language">Default Language</Label>
				<Select.Root type="single" value={form.language} onValueChange={(v) => form.language = v}>
					<Select.Trigger class="w-full">
						{form.language === 'en' ? 'English' : form.language === 'ar' ? 'Arabic' : form.language}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="en">English</Select.Item>
						<Select.Item value="ar">Arabic</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</CardContent>
	</Card>

	<div class="flex justify-end">
		<Button type="submit" disabled={saving} class="gap-2">
			<Save class="w-4 h-4" />
			{saving ? 'Saving...' : 'Save Changes'}
		</Button>
	</div>
</form>
