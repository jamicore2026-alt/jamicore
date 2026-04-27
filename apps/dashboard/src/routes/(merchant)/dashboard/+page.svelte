<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Users from '@lucide/svelte/icons/users';
	import Package from '@lucide/svelte/icons/package';
	import TrendingUp from '@lucide/svelte/icons/trending-up';

	let { data } = $props();
	const stats = $derived(data.stats);
	const recentOrders = $derived(data.recentOrders || []);

	function formatPrice(p: string | number) {
		return `$${Number(p || 0).toFixed(2)}`;
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		processing: 'bg-info/15 text-info border-info/30',
		shipped: 'bg-primary/15 text-primary border-primary/30',
		delivered: 'bg-success/15 text-success border-success/30',
		cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
	};
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Welcome to your dashboard</h1>
		<p class="text-muted-foreground">Here is an overview of your store activity.</p>
	</div>

	<!-- KPI Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Plan Usage -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Plan Usage</CardTitle>
				<Package class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>Products</span>
						<span class="text-muted-foreground">{stats?.usedProducts ?? 0} / {stats?.maxProducts ?? 100}</span>
					</div>
					<div class="h-2 bg-muted rounded-full overflow-hidden">
						<div class="h-full bg-primary rounded-full transition-all" style="width: {Math.min(100, ((stats?.usedProducts ?? 0) / (stats?.maxProducts || 1)) * 100)}%"></div>
					</div>
					<div class="flex justify-between text-sm">
						<span>Staff</span>
						<span class="text-muted-foreground">{stats?.usedStaff ?? 0} / {stats?.maxStaff ?? 3}</span>
					</div>
					<div class="h-2 bg-muted rounded-full overflow-hidden">
						<div class="h-full bg-secondary rounded-full transition-all" style="width: {Math.min(100, ((stats?.usedStaff ?? 0) / (stats?.maxStaff || 1)) * 100)}%"></div>
					</div>
				</div>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Revenue</CardTitle>
				<DollarSign class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatPrice(stats?.totalRevenue || 0)}</div>
				{#if stats?.revenueChange}
					<p class="text-xs text-muted-foreground flex items-center gap-1 mt-1">
						<TrendingUp class="w-3 h-3 text-success" />
						+{stats.revenueChange}% from last month
					</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Orders</CardTitle>
				<ShoppingCart class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats?.totalOrders ?? '—'}</div>
				{#if stats?.pendingOrders}
					<p class="text-xs text-muted-foreground mt-1">{stats.pendingOrders} pending</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Customers</CardTitle>
				<Users class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats?.totalCustomers ?? '—'}</div>
				{#if stats?.newCustomers}
					<p class="text-xs text-muted-foreground mt-1">+{stats.newCustomers} this month</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Products</CardTitle>
				<Package class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats?.totalProducts ?? '—'}</div>
				{#if stats?.outOfStockProducts}
					<p class="text-xs text-destructive mt-1">{stats.outOfStockProducts} out of stock</p>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Recent Orders -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
		<Card class="col-span-4">
			<CardHeader class="flex flex-row items-center justify-between">
				<CardTitle>Recent Orders</CardTitle>
				<a href="/dashboard/orders" class="text-sm text-primary hover:underline">View all →</a>
			</CardHeader>
			<CardContent>
				{#if recentOrders.length === 0}
					<p class="text-muted-foreground text-center py-8">No orders yet</p>
				{:else}
					<div class="space-y-3">
						{#each recentOrders as order (order.id)}
							<div
								class="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
								role="button"
								tabindex="0"
								onclick={() => goto(`/dashboard/orders/${order.id}`)}
								onkeydown={(e) => e.key === 'Enter' && goto(`/dashboard/orders/${order.id}`)}
							>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-sm">#{order.orderNumber}</p>
									<p class="text-xs text-muted-foreground truncate">{order.email}</p>
								</div>
								<Badge class={`text-xs ${statusColors[order.status] || ''}`}>{order.status}</Badge>
								<span class="text-sm font-medium">{formatPrice(order.total)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card class="col-span-3">
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<a href="/dashboard/products/new" class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
						<div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
							<Package class="w-4 h-4 text-primary" />
						</div>
						<div>
							<p class="text-sm font-medium">Add Product</p>
							<p class="text-xs text-muted-foreground">Create a new product listing</p>
						</div>
					</a>
					<a href="/dashboard/orders" class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
						<div class="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
							<ShoppingCart class="w-4 h-4 text-info" />
						</div>
						<div>
							<p class="text-sm font-medium">Manage Orders</p>
							<p class="text-xs text-muted-foreground">Process and fulfill orders</p>
						</div>
					</a>
					<a href="/dashboard/settings/branding" class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
						<div class="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
							<TrendingUp class="w-4 h-4 text-warning" />
						</div>
						<div>
							<p class="text-sm font-medium">Customize Branding</p>
							<p class="text-xs text-muted-foreground">Update colors and theme</p>
						</div>
					</a>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
