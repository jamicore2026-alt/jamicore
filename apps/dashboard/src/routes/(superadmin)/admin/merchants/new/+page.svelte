<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types.js';
	import type { Writable } from 'svelte/store';
	import type { merchantRegisterSchema } from '@repo/shared-types';
	import type { z } from 'zod';
	import type { ValidationErrors } from 'sveltekit-superforms';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	type MerchantForm = z.infer<typeof merchantRegisterSchema>;

	let { data }: { data: PageData } = $props();

	const sf = superForm(data.form, {
		delayMs: 300,
		dataType: 'form',
	});

	const form = sf.form as Writable<MerchantForm>;
	const errors = sf.errors as Writable<ValidationErrors<MerchantForm>>;
	const enhance = sf.enhance;
	const enhancing = sf.submitting;
</script>

<div class="max-w-2xl mx-auto space-y-6">
	<Button variant="ghost" size="sm" onclick={() => goto('/admin/merchants')}>
		<ArrowLeft class="w-4 h-4 mr-2" />
		Back to merchants
	</Button>

	<Card>
		<CardHeader>
			<CardTitle>Create Merchant</CardTitle>
			<CardDescription>Create a new merchant store and owner account</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="storeName">Store Name</Label>
					<Input id="storeName" name="storeName" placeholder="My Store" bind:value={$form.storeName} aria-invalid={$errors.storeName ? 'true' : undefined} />
					{#if $errors.storeName}
						<p class="text-sm text-destructive">{$errors.storeName}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="domain">Domain</Label>
					<Input id="domain" name="domain" placeholder="mystore" bind:value={$form.domain} aria-invalid={$errors.domain ? 'true' : undefined} />
					{#if $errors.domain}
						<p class="text-sm text-destructive">{$errors.domain}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="ownerEmail">Owner Email</Label>
					<Input id="ownerEmail" type="email" name="ownerEmail" placeholder="owner@example.com" bind:value={$form.ownerEmail} aria-invalid={$errors.ownerEmail ? 'true' : undefined} />
					{#if $errors.ownerEmail}
						<p class="text-sm text-destructive">{$errors.ownerEmail}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="ownerName">Owner Name</Label>
					<Input id="ownerName" name="ownerName" placeholder="John Doe" bind:value={$form.ownerName} aria-invalid={$errors.ownerName ? 'true' : undefined} />
					{#if $errors.ownerName}
						<p class="text-sm text-destructive">{$errors.ownerName}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="ownerPhone">Owner Phone</Label>
					<Input id="ownerPhone" name="ownerPhone" placeholder="+1 234 567 890" bind:value={$form.ownerPhone} aria-invalid={$errors.ownerPhone ? 'true' : undefined} />
					{#if $errors.ownerPhone}
						<p class="text-sm text-destructive">{$errors.ownerPhone}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input id="password" type="password" name="password" placeholder="Min 8 chars, uppercase, lowercase, number" bind:value={$form.password} aria-invalid={$errors.password ? 'true' : undefined} />
					{#if $errors.password}
						<p class="text-sm text-destructive">{$errors.password}</p>
					{/if}
				</div>

				<Button type="submit" class="w-full" disabled={$enhancing}>
					{#if $enhancing}
						Creating...
					{:else}
						Create Merchant
					{/if}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
