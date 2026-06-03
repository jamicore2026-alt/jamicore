<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import Search from '@lucide/svelte/icons/search';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Download from '@lucide/svelte/icons/download';
	import Calendar from '@lucide/svelte/icons/calendar';
	import { Label } from '$lib/components/ui/label';

	let { data } = $props();

		// svelte-ignore state_referenced_locally
	let { search = '' } = data;
	let searchValue = $state(search);

	let dateFrom = $state.raw(data.dateFrom || '');
	let dateTo = $state.raw(data.dateTo || '');

	interface OrderRow {
		id: string;
		orderNumber: string;
		billingFirstName: string | null;
		billingLastName: string | null;
		email: string | null;
		phone: string | null;
		createdAt: string;
		status: string;
		paymentStatus: string;
		total: string | number;
	}

	const orders = $derived<OrderRow[]>(data.orders?.orders || []);
	const total = $derived(data.orders?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const statuses = ['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		processing: 'bg-info/15 text-info border-info/30',
		shipped: 'bg-primary/15 text-primary border-primary/30',
		delivered: 'bg-success/15 text-success border-success/30',
		cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	function filterByStatus(s: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (s) params.set('status', s);
		else params.delete('status');
		params.set('page', '1');
		goto(`/dashboard/orders?${params}`);
	}

	function doSearch() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) params.set('search', searchValue);
		else params.delete('search');
		params.set('page', '1');
		goto(`/dashboard/orders?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/orders?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p).toFixed(2)}`;
	}

	function applyDateFilter() {
		const params = new URLSearchParams(page.url.searchParams);
		if (dateFrom) params.set('dateFrom', dateFrom);
		else params.delete('dateFrom');
		if (dateTo) params.set('dateTo', dateTo);
		else params.delete('dateTo');
		params.set('page', '1');
		goto(`/dashboard/orders?${params}`);
	}

	function exportCsv() {
		const rows = orders;
		if (rows.length === 0) return;

		const headers = ['Order #', 'Customer', 'Email', 'Phone', 'Date', 'Status', 'Payment', 'Total'];
		const lines = rows.map((o) => [
			o.orderNumber,
			`${o.billingFirstName || ''} ${o.billingLastName || ''}`.trim(),
			o.email || '',
			o.phone || '',
			formatDate(o.createdAt),
			o.status,
			o.paymentStatus,
			o.total,
		]);

		const csv = [headers, ...lines].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	let eventSource: EventSource | null = null;

	onMount(() => {
		eventSource = new EventSource('/api/v1/merchant/notifications', { withCredentials: true });
		eventSource.onmessage = (e) => {
			try {
				const data = JSON.parse(e.data);
				if (data.type === 'order.new' || data.type === 'order.status_updated') {
					invalidateAll();
				}
			} catch { /* ignore parse errors */ }
		};
		eventSource.onerror = () => {
			eventSource?.close();
			eventSource = null;
		};
	});

	onDestroy(() => {
		eventSource?.close();
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Orders</h1>
		<p class="text-muted-foreground">Manage and fulfill customer orders</p>
	</div>

	<!-- Status Filters -->
	<div class="flex flex-wrap gap-2">
		{#each statuses as s}
			<Button
				variant={data.status === s ? 'default' : 'outline'}
				size="sm"
				onclick={() => filterByStatus(s)}
			>
				{s || 'All'}
			</Button>
		{/each}
	</div>

	<!-- Filters -->
	<Card>
		<CardContent class="p-4">
			<div class="flex flex-col gap-4">
				<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex gap-3">
					<div class="relative flex-1">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input bind:value={searchValue} placeholder="Search by order number or email..." class="pl-10" />
					</div>
					<Button type="submit" variant="secondary">Search</Button>
				</form>
				<div class="flex flex-col sm:flex-row gap-3 items-end">
					<div class="grid grid-cols-2 gap-3 flex-1">
						<div class="space-y-1">
							<Label class="text-xs">From</Label>
							<Input type="date" bind:value={dateFrom} />
						</div>
						<div class="space-y-1">
							<Label class="text-xs">To</Label>
							<Input type="date" bind:value={dateTo} />
						</div>
					</div>
					<div class="flex gap-2">
						<Button size="sm" onclick={applyDateFilter} class="gap-1">
							<Calendar class="w-3.5 h-3.5" />
							Filter
						</Button>
						<Button variant="outline" size="sm" onclick={exportCsv} class="gap-1">
							<Download class="w-3.5 h-3.5" />
							Export
						</Button>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Orders Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} order{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if orders.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<ShoppingCart class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No orders found</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Order</Table.Head>
							<Table.Head>Customer</Table.Head>
							<Table.Head>Date</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-center">Payment</Table.Head>
							<Table.Head class="text-right">Total</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each orders as order (order.id)}
							<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/dashboard/orders/${order.id}`)}>
								<Table.Cell class="font-medium">#{order.orderNumber}</Table.Cell>
								<Table.Cell>
									<span>{order.email}</span>
									{#if order.phone}
										<br /><span class="text-xs text-muted-foreground">{order.phone}</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(order.createdAt)}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={statusColors[order.status] || ''}>
										{order.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-center">
									<Badge variant="outline" class="capitalize">{order.paymentStatus}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right font-medium">{formatPrice(order.total)}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

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
