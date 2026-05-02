<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
		import * as Table from '$lib/components/ui/table';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Users from '@lucide/svelte/icons/users';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
		import Activity from '@lucide/svelte/icons/activity';

	let { data } = $props();

	const summary = $derived(data.revenue?.summary || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalCustomers: 0 });
	const byStore = $derived(data.revenue?.byStore || []);

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

	const statCards = $derived([
		{
			label: 'Total Revenue',
			value: formatCurrency(summary.totalRevenue),
			raw: summary.totalRevenue,
			icon: DollarSign,
			accent: 'emerald',
			gradient: 'from-emerald-500/20 to-emerald-500/5',
			glow: 'rgba(16,185,129,0.15)',
		},
		{
			label: 'Total Orders',
			value: summary.totalOrders.toLocaleString(),
			raw: summary.totalOrders,
			icon: ShoppingBag,
			accent: 'blue',
			gradient: 'from-blue-500/20 to-blue-500/5',
			glow: 'rgba(59,130,246,0.15)',
		},
		{
			label: 'Avg Order Value',
			value: formatCurrency(summary.avgOrderValue),
			raw: summary.avgOrderValue,
			icon: TrendingUp,
			accent: 'purple',
			gradient: 'from-purple-500/20 to-purple-500/5',
			glow: 'rgba(139,92,246,0.15)',
		},
		{
			label: 'Customers',
			value: summary.totalCustomers.toLocaleString(),
			raw: summary.totalCustomers,
			icon: Users,
			accent: 'amber',
			gradient: 'from-amber-500/20 to-amber-500/5',
			glow: 'rgba(245,158,11,0.15)',
		},
	]);

	function borderCls(accent: string): string {
		switch (accent) {
			case 'emerald': return 'border-emerald-500/20';
			case 'blue': return 'border-blue-500/20';
			case 'purple': return 'border-purple-500/20';
			case 'amber': return 'border-amber-500/20';
			default: return '';
		}
	}

	function textCls(accent: string): string {
		switch (accent) {
			case 'emerald': return 'text-emerald-500';
			case 'blue': return 'text-blue-500';
			case 'purple': return 'text-purple-500';
			case 'amber': return 'text-amber-500';
			default: return '';
		}
	}

	function barCls(accent: string): string {
		switch (accent) {
			case 'emerald': return 'bg-emerald-500';
			case 'blue': return 'bg-blue-500';
			case 'purple': return 'bg-purple-500';
			case 'amber': return 'bg-amber-500';
			default: return '';
		}
	}
</script>

<div class="space-y-8 stagger-children">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Activity class="w-4 h-4 text-primary" />
				<span class="text-[11px] font-mono uppercase tracking-widest text-primary">Finance</span>
			</div>
			<h1 class="text-3xl font-bold tracking-tight font-heading">Revenue</h1>
			<p class="text-muted-foreground mt-1 text-sm">Platform-wide revenue analytics.</p>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each statCards as card}
			{@const Icon = card.icon}
			<Card class="glass-card relative overflow-hidden group">
				<div class="absolute inset-0 bg-gradient-to-br {card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
				<div class="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity" style="background: {card.glow};"></div>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
					<CardTitle class="text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">{card.label}</CardTitle>
					<div class="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 {borderCls(card.accent)}">
						<Icon class="w-4 h-4 {textCls(card.accent)}" />
					</div>
				</CardHeader>
				<CardContent class="relative z-10">
					<div class="text-2xl font-bold font-heading tracking-tight">{card.value}</div>
					<div class="mt-3 h-1 w-full rounded-full bg-white/5 overflow-hidden">
						<div class="h-full rounded-full transition-all duration-700 {barCls(card.accent)}" style="width: 100%; box-shadow: 0 0 8px {card.glow};"></div>
					</div>
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Store Breakdown -->
	<Card class="glass-card">
		<CardHeader class="pb-4">
			<CardTitle class="text-base font-semibold font-heading flex items-center gap-2">
				<span class="h-2 w-2 rounded-full bg-primary" style="box-shadow: 0 0 8px rgba(6,182,212,0.6);"></span>
				Revenue by Store
			</CardTitle>
			<p class="text-sm text-muted-foreground mt-0.5">Breakdown by merchant store</p>
		</CardHeader>
		<CardContent class="p-0">
			{#if byStore.length === 0}
				<div class="flex flex-col items-center justify-center py-14 text-center">
					<div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4" style="box-shadow: 0 0 24px rgba(6,182,212,0.05);">
						<BarChart3 class="h-7 w-7 text-muted-foreground/40" />
					</div>
					<p class="text-muted-foreground font-medium font-heading">No revenue data yet</p>
					<p class="text-sm text-muted-foreground/70 mt-1">Revenue will appear here once orders are placed</p>
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
