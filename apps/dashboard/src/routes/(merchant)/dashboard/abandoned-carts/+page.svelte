<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Package from '@lucide/svelte/icons/package';
	import User from '@lucide/svelte/icons/user';
	import Clock from '@lucide/svelte/icons/clock';

	let { data } = $props();

	const items = $derived(data.carts?.items || []);
	const total = $derived(data.carts?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));
	const hoursFilter = $derived(data.hours || '24');
	const count = $derived(data.count || 0);

	const hourOptions = [
		{ value: '1', label: 'Last 1 hour' },
		{ value: '6', label: 'Last 6 hours' },
		{ value: '24', label: 'Last 24 hours' },
		{ value: '48', label: 'Last 48 hours' },
		{ value: '72', label: 'Last 3 days' },
		{ value: '168', label: 'Last 7 days' },
	];

	function updateHours(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		params.set('hours', value);
		goto(`/dashboard/abandoned-carts?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/abandoned-carts?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p || 0).toFixed(2)}`;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Abandoned Carts</h1>
		<p class="text-muted-foreground">Carts left inactive with items still inside</p>
	</div>

	<!-- Stats -->
	<div class="grid gap-4 sm:grid-cols-3">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Abandoned Carts</CardTitle>
				<ShoppingCart class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{count}</div>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Items</CardTitle>
				<Package class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{items.reduce((sum: number, c: { itemCount?: number }) => sum + (c.itemCount || 0), 0)}</div>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Window</CardTitle>
				<Clock class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{hoursFilter}h</div>
			</CardContent>
		</Card>
	</div>

	<!-- Filter -->
	<Card>
		<CardContent class="p-4">
			<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
					<Clock class="w-4 h-4 text-muted-foreground shrink-0" />
					<span class="text-sm text-muted-foreground">Inactive for:</span>
				</div>
				<Select.Root type="single" value={hoursFilter} onValueChange={(v) => updateHours(v)}>
					<Select.Trigger class="w-[200px]">
						{hourOptions.find((o) => o.value === hoursFilter)?.label || 'Last 24 hours'}
					</Select.Trigger>
					<Select.Content>
						{#each hourOptions as opt}
							<Select.Item value={opt.value}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</CardContent>
	</Card>

	<!-- Carts List -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} cart{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if items.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<ShoppingCart class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No abandoned carts</p>
					<p class="text-sm mt-1">Great! No carts have been left inactive with items in the selected time window.</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each items as cart (cart.id)}
						<div class="p-4 sm:p-5">
							<div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
								<div class="flex items-center gap-2">
									<div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
										<User class="w-4 h-4 text-muted-foreground" />
									</div>
									<div>
										<p class="text-sm font-medium">
											{cart.customer?.email || 'Guest'}
										</p>
										{#if cart.customer?.firstName}
											<p class="text-xs text-muted-foreground">{cart.customer.firstName} {cart.customer.lastName || ''}</p>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<Clock class="w-3 h-3" />
									Last active: {formatDate(cart.updatedAt)}
								</div>
							</div>

							{#if cart.items && cart.items.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each cart.items.slice(0, 4) as item}
										<Badge variant="outline" class="text-xs">
											{item.product?.titleEn || 'Product'} x{item.quantity}
										</Badge>
									{/each}
									{#if cart.items.length > 4}
										<Badge variant="secondary" class="text-xs">+{cart.items.length - 4} more</Badge>
									{/if}
								</div>
							{/if}

							{#if cart.total}
								<div class="mt-2 text-sm font-medium">
									Cart total: {formatPrice(cart.total)}
								</div>
							{/if}
						</div>
					{/each}
				</div>

				{#if totalPages > 1}
					<Separator />
					<div class="flex items-center justify-between p-4">
						<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
						<div class="flex gap-1">
							<Button variant="outline" size="sm" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
								<ChevronLeft class="w-4 h-4" />
							</Button>
							<Button variant="outline" size="sm" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
								<ChevronRight class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>
