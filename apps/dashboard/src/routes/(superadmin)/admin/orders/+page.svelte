<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Separator } from '$lib/components/ui/separator';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';

	let { data } = $props();

	const orders = $derived(data.orders?.orders || []);
	const total = $derived(data.orders?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const statuses = ['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
		processing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
		shipped: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900',
		delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900',
		cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
	};

	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout>;

	function filterByStatus(s: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (s) params.set('status', s);
		else params.delete('status');
		params.set('page', '1');
		goto(`/admin/orders?${params}`);
	}

	function handleSearch(query: string) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const params = new URLSearchParams(page.url.searchParams);
			if (query.trim()) params.set('search', query.trim());
			else params.delete('search');
			params.set('page', '1');
			goto(`/admin/orders?${params}`);
		}, 300);
	}

	function clearSearch() {
		searchQuery = '';
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('search');
		params.set('page', '1');
		goto(`/admin/orders?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/admin/orders?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatCurrency(amount: string | number, currency = 'USD') {
		const num = typeof amount === 'string' ? parseFloat(amount) : amount;
		return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
	}

	$effect(() => {
		const urlSearch = page.url.searchParams.get('search') || '';
		if (urlSearch !== searchQuery) searchQuery = urlSearch;
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Orders</h1>
			<p class="text-muted-foreground">Platform-wide order management</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<div class="relative flex-1 max-w-md">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				placeholder="Search by order number, email, or name..."
				class="pl-9 pr-9"
				bind:value={searchQuery}
				oninput={() => handleSearch(searchQuery)}
			/>
			{#if searchQuery}
				<button
					class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					onclick={clearSearch}
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each statuses as s}
				<Button variant={data.status === s ? 'default' : 'outline'} size="sm" onclick={() => filterByStatus(s)}>
					{s || 'All'}
				</Button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-base">{total} order{total !== 1 ? 's' : ''}{data.search ? ` matching "${data.search}"` : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if orders.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<ShoppingCart class="w-12 h-12 text-muted-foreground/40 mb-3" />
					<p class="text-lg font-medium text-muted-foreground">
						{data.search ? 'No orders found' : 'No orders yet'}
					</p>
					{#if data.search}
						<p class="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 px-6">
					<Table.Root class="min-w-[800px]">
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-[140px]">Order#</Table.Head>
								<Table.Head>Customer</Table.Head>
								<Table.Head class="text-center">Status</Table.Head>
								<Table.Head class="text-right">Total</Table.Head>
								<Table.Head class="hidden md:table-cell">Payment</Table.Head>
								<Table.Head class="text-right hidden sm:table-cell">Date</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each orders as order (order.id)}
								<Table.Row class="cursor-pointer hover:bg-muted/50">
									<Table.Cell class="font-medium truncate max-w-[140px]">{order.orderNumber}</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col">
											<span class="truncate max-w-[200px]">{order.email}</span>
											{#if order.customer}
												<span class="text-xs text-muted-foreground">{order.customer.firstName} {order.customer.lastName}</span>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell class="text-center">
										<Badge class="{statusColors[order.status] || ''} capitalize whitespace-nowrap">{order.status}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right font-medium">{formatCurrency(order.total, order.currency)}</Table.Cell>
									<Table.Cell class="hidden md:table-cell">
										<Badge variant="outline" class="capitalize">{order.paymentStatus}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right text-muted-foreground hidden sm:table-cell whitespace-nowrap">{formatDate(order.createdAt)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
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
