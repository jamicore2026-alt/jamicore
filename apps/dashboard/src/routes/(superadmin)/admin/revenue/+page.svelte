<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Users from '@lucide/svelte/icons/users';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Store from '@lucide/svelte/icons/store';

	let { data } = $props();

	const summary = $derived(data.revenue?.summary || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalCustomers: 0 });
	const byStore = $derived(data.revenue?.byStore || []);

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Revenue</h1>
		<p class="text-muted-foreground">Platform-wide revenue analytics.</p>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="border-l-4 border-l-emerald-500">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
				<div class="rounded-md bg-emerald-500/10 p-2">
					<DollarSign class="h-4 w-4 text-emerald-500" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
			</CardContent>
		</Card>

		<Card class="border-l-4 border-l-blue-500">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
				<div class="rounded-md bg-blue-500/10 p-2">
					<ShoppingBag class="h-4 w-4 text-blue-500" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{summary.totalOrders}</div>
			</CardContent>
		</Card>

		<Card class="border-l-4 border-l-purple-500">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
				<div class="rounded-md bg-purple-500/10 p-2">
					<TrendingUp class="h-4 w-4 text-purple-500" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatCurrency(summary.avgOrderValue)}</div>
			</CardContent>
		</Card>

		<Card class="border-l-4 border-l-amber-500">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium text-muted-foreground">Customers</CardTitle>
				<div class="rounded-md bg-amber-500/10 p-2">
					<Users class="h-4 w-4 text-amber-500" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{summary.totalCustomers}</div>
			</CardContent>
		</Card>
	</div>

	<!-- Store Breakdown -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Store class="w-4 h-4" />
				Revenue by Store
			</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if byStore.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<BarChart3 class="w-12 h-12 text-muted-foreground/40 mb-3" />
					<p class="text-lg font-medium text-muted-foreground">No revenue data yet</p>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 px-6">
					<Table.Root class="min-w-[500px]">
						<Table.Header>
							<Table.Row>
								<Table.Head>Store</Table.Head>
								<Table.Head class="text-right">Orders</Table.Head>
								<Table.Head class="text-right">Revenue</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each byStore as store (store.storeId)}
								<Table.Row>
									<Table.Cell class="font-medium">{store.storeName || 'Unknown'}</Table.Cell>
									<Table.Cell class="text-right">{store.orderCount}</Table.Cell>
									<Table.Cell class="text-right font-medium">{formatCurrency(store.revenue)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
