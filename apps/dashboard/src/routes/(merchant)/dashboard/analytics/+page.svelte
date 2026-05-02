<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Users from '@lucide/svelte/icons/users';
	import Package from '@lucide/svelte/icons/package';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Activity from '@lucide/svelte/icons/activity';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Award from '@lucide/svelte/icons/award';
	import { Chart, registerables } from 'chart.js';

	let { data } = $props();

	const stats = $derived(data.stats || {});
	const revenue = $derived(data.revenue || []);
	const topProducts = $derived(data.topProducts || []);
	const orderStatus = $derived(data.orderStatus || []);
	const customerInsights = $derived(data.customerInsights || null);

	let revenueChartCanvas: HTMLCanvasElement = $state()!;
	let revenueChart: Chart | null = null;

	function formatPrice(p: string | number) {
		return `$${Number(p || 0).toFixed(2)}`;
	}

	const statCards = $derived([
		{ label: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-500' },
		{ label: 'Total Orders', value: stats.totalOrders ?? 0, icon: ShoppingCart, color: 'text-blue-500' },
		{ label: 'Customers', value: stats.totalCustomers ?? 0, icon: Users, color: 'text-purple-500' },
		{ label: 'Products', value: stats.totalProducts ?? 0, icon: Package, color: 'text-amber-500' },
		{ label: 'Avg Order Value', value: formatPrice(stats.averageOrderValue), icon: TrendingUp, color: 'text-cyan-500' },
		{ label: 'Recent Revenue (30d)', value: formatPrice(stats.recentRevenue), icon: Activity, color: 'text-rose-500' },
	]);

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		processing: 'bg-info/15 text-info border-info/30',
		shipped: 'bg-primary/15 text-primary border-primary/30',
		delivered: 'bg-success/15 text-success border-success/30',
		cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
		fulfilled: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
		refunded: 'bg-muted/15 text-muted-foreground border-muted/30',
	};

	$effect(() => {
		if (revenueChartCanvas && revenue.length > 0) {
			if (revenueChart) {
				revenueChart.destroy();
				revenueChart = null;
			}
			const ctx = revenueChartCanvas.getContext('2d');
			if (!ctx) return;

			Chart.register(...registerables);
			revenueChart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: revenue.map((r: any) => r.period),
					datasets: [{
						label: 'Revenue',
						data: revenue.map((r: any) => Number(r.revenue)),
						borderColor: 'rgba(6, 182, 212, 1)',
						backgroundColor: 'rgba(6, 182, 212, 0.1)',
						fill: true,
						tension: 0.4,
						pointRadius: 3,
						pointBackgroundColor: 'rgba(6, 182, 212, 1)',
					}],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: {
							callbacks: {
								label: (context) => `Revenue: $${Number(context.parsed.y).toFixed(2)}`,
							},
						},
					},
					scales: {
						x: {
							grid: { color: 'rgba(255,255,255,0.05)' },
							ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 8 },
						},
						y: {
							grid: { color: 'rgba(255,255,255,0.05)' },
							ticks: {
								color: 'rgba(255,255,255,0.5)',
								callback: (value) => `$${Number(value).toFixed(0)}`,
							},
						},
					},
				},
			});
		}
	});

	onMount(() => {
		return () => {
			if (revenueChart) {
				revenueChart.destroy();
				revenueChart = null;
			}
		};
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Analytics</h1>
		<p class="text-muted-foreground">Insights into your store performance.</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each statCards as card}
			{@const Icon = card.icon}
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">{card.label}</CardTitle>
					<Icon class="w-4 h-4 {card.color}" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{card.value}</div>
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Customer Insights -->
	{#if customerInsights}
		<div class="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">New Customers (30d)</CardTitle>
					<Users class="w-4 h-4 text-emerald-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{customerInsights.newCustomers ?? 0}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Returning Customers</CardTitle>
					<Users class="w-4 h-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{customerInsights.returningCustomers ?? 0}</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	<!-- Revenue Chart -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between">
			<div>
				<CardTitle class="flex items-center gap-2">
					<BarChart3 class="w-4 h-4" />
					Revenue Trend
				</CardTitle>
				<p class="text-sm text-muted-foreground mt-1">Daily revenue over the last 30 days</p>
			</div>
		</CardHeader>
		<CardContent>
			{#if revenue.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
					<BarChart3 class="w-12 h-12 mb-3 opacity-50" />
					<p class="font-medium">No revenue data yet</p>
					<p class="text-sm">Revenue trends will appear once orders are placed.</p>
				</div>
			{:else}
				<div class="h-[300px] w-full">
					<canvas bind:this={revenueChartCanvas}></canvas>
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Top Products -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Award class="w-4 h-4" />
					Top Products
				</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				{#if topProducts.length === 0}
					<div class="py-12 text-center text-muted-foreground">
						<Package class="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p class="font-medium">No product sales yet</p>
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Product</Table.Head>
								<Table.Head class="text-right">Sold</Table.Head>
								<Table.Head class="text-right">Revenue</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each topProducts as product (product.productId)}
								<Table.Row>
									<Table.Cell class="font-medium truncate max-w-[200px]">
										{product.productTitle || 'Unknown'}
									</Table.Cell>
									<Table.Cell class="text-right">{product.totalSold}</Table.Cell>
									<Table.Cell class="text-right font-medium">{formatPrice(product.totalRevenue)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</CardContent>
		</Card>

		<!-- Orders by Status -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<ShoppingCart class="w-4 h-4" />
					Orders by Status
				</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				{#if orderStatus.length === 0}
					<div class="py-12 text-center text-muted-foreground">
						<ShoppingCart class="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p class="font-medium">No orders yet</p>
					</div>
				{:else}
					<div class="p-4 space-y-3">
						{#each orderStatus as os (os.status)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Badge class={statusColors[os.status] || ''}>{os.status}</Badge>
								</div>
								<span class="text-sm font-medium">{os.count}</span>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
