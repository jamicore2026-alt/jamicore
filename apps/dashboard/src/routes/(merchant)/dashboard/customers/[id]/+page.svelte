<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import User from '@lucide/svelte/icons/user';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Tag from '@lucide/svelte/icons/tag';
	import Save from '@lucide/svelte/icons/save';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
		// svelte-ignore state_referenced_locally
	let { customer } = data;
	let tagInput = $state(customer?.tags || '');
	let savingTags = $state(false);

	async function saveTags() {
		savingTags = true;
		try {
			await apiFetch(`/merchant/customers/${customer.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ tags: tagInput.trim() || undefined }),
			});
			toast.success('Tags updated');
			invalidateAll();
		} catch {
			toast.error('Failed to update tags');
		} finally {
			savingTags = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p).toFixed(2)}`;
	}

	function parseTags(tags: string | null): string[] {
		if (!tags) return [];
		return tags.split(',').map((t) => t.trim()).filter(Boolean);
	}
</script>

<div class="space-y-6 max-w-5xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" href="/dashboard/customers" class="gap-2">
				<ArrowLeft class="w-4 h-4" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">
					{customer.firstName || ''} {customer.lastName || ''}
				</h1>
				{#if !customer.firstName && !customer.lastName}
					<p class="text-muted-foreground">Customer #{customer.id?.slice(-8)}</p>
				{/if}
			</div>
		</div>
		<Badge class={`text-sm px-3 py-1 ${customer.isVerified ? 'bg-success/15 text-success border-success/30' : ''}`}>
			{customer.isVerified ? 'Verified' : 'Unverified'}
		</Badge>
	</div>

	<div class="grid md:grid-cols-3 gap-6">
		<!-- Main Column -->
		<div class="md:col-span-2 space-y-6">
			<!-- Orders -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<ShoppingCart class="w-5 h-5" />
						Orders ({customer.orders?.length || 0})
					</CardTitle>
				</CardHeader>
				<CardContent class="p-0">
					{#if customer.orders?.length}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Order</Table.Head>
									<Table.Head>Date</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="text-right">Total</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each customer.orders as order (order.id)}
									<Table.Row class="cursor-pointer hover:bg-muted/50">
										<Table.Cell class="font-medium">#{order.orderNumber || order.id?.slice(-8)}</Table.Cell>
										<Table.Cell class="text-muted-foreground">{formatDate(order.createdAt)}</Table.Cell>
										<Table.Cell>
											<Badge variant="outline" class="capitalize text-xs">{order.status}</Badge>
										</Table.Cell>
										<Table.Cell class="text-right font-medium">{formatPrice(order.total)}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<div class="py-12 text-center text-muted-foreground">
							<ShoppingCart class="w-10 h-10 mx-auto mb-2 opacity-50" />
							<p class="text-sm">No orders yet</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Contact Info -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<User class="w-4 h-4" />
						Contact Info
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3 text-sm">
					<div class="flex items-center gap-2">
						<Mail class="w-4 h-4 text-muted-foreground" />
						<span>{customer.email}</span>
					</div>
					{#if customer.phone}
						<div class="flex items-center gap-2">
							<Phone class="w-4 h-4 text-muted-foreground" />
							<span>{customer.phone}</span>
						</div>
					{/if}
					<Separator />
					<div class="flex items-center gap-2 text-muted-foreground">
						<Calendar class="w-4 h-4" />
						<span>Joined {formatDate(customer.createdAt)}</span>
					</div>
				</CardContent>
			</Card>

			<!-- Addresses -->
			{#if customer.addresses?.length}
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Addresses</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						{#each customer.addresses as address (address.id)}
							<div class="text-sm">
								{#if address.isDefault}
									<Badge variant="secondary" class="mb-1">Default</Badge>
								{/if}
								<p class="font-medium">{address.firstName} {address.lastName}</p>
								<p class="text-muted-foreground">{address.line1}</p>
								{#if address.line2}
									<p class="text-muted-foreground">{address.line2}</p>
								{/if}
								<p class="text-muted-foreground">{address.city}, {address.state} {address.postalCode}</p>
								<p class="text-muted-foreground">{address.country}</p>
							</div>
						{/each}
					</CardContent>
				</Card>
			{/if}

			<!-- Tags -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<Tag class="w-4 h-4" />
						Tags
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex flex-wrap gap-1">
						{#each parseTags(customer.tags) as tag}
							<Badge variant="secondary" class="text-xs">{tag}</Badge>
						{/each}
						{#if !customer.tags}
							<span class="text-sm text-muted-foreground">No tags</span>
						{/if}
					</div>
					<div class="space-y-2">
						<Label for="tags" class="text-xs">Edit Tags (comma separated)</Label>
						<Input id="tags" bind:value={tagInput} placeholder="vip, wholesale, repeat..." />
						<Button size="sm" variant="outline" class="gap-2" disabled={savingTags} onclick={saveTags}>
							<Save class="w-3.5 h-3.5" />
							{savingTags ? 'Saving...' : 'Save Tags'}
						</Button>
					</div>
				</CardContent>
			</Card>

			<!-- Spending Summary -->
			<Card>
				<CardHeader>
					<CardTitle class="text-base">Spending Summary</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Total Orders</span>
						<span class="font-medium">{customer.orders?.length || 0}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Total Spent</span>
						<span class="font-medium">{formatPrice(customer.totalSpent || 0)}</span>
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
