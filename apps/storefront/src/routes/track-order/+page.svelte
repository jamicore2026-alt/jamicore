<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Search, Package, Truck, CheckCircle, XCircle, Clock } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let orderNumber = $state('');
	let email = $state('');
	let loading = $state(false);
	let order = $state<any>(null);

	async function trackOrder() {
		if (!orderNumber.trim() || !email.trim()) {
			toast.error('Please enter both order number and email');
			return;
		}
		loading = true;
		order = null;
		try {
			const params = new URLSearchParams({ orderNumber: orderNumber.trim(), email: email.trim() });
			const res = await fetch(`/api/v1/public/orders/track?${params}`);
			if (!res.ok) {
				if (res.status === 404) {
					toast.error('Order not found. Please check your order number and email.');
				} else {
					toast.error('Failed to track order');
				}
				return;
			}
			const data = await res.json();
			order = data.order;
		} catch {
			toast.error('Failed to track order');
		} finally {
			loading = false;
		}
	}

	function statusIcon(status: string) {
		switch (status) {
			case 'pending': return Clock;
			case 'processing': return Package;
			case 'shipped': return Truck;
			case 'delivered': return CheckCircle;
			case 'cancelled': return XCircle;
			default: return Clock;
		}
	}

	function statusColor(status: string) {
		switch (status) {
			case 'pending': return 'bg-warning/15 text-warning border-warning/30';
			case 'processing': return 'bg-info/15 text-info border-info/30';
			case 'shipped': return 'bg-primary/15 text-primary border-primary/30';
			case 'delivered': return 'bg-success/15 text-success border-success/30';
			case 'cancelled': return 'bg-destructive/15 text-destructive border-destructive/30';
			default: return 'bg-secondary/15 text-secondary border-secondary/30';
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p).toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Track Order</title>
	<meta name="description" content="Track your order status" />
</svelte:head>

<div class="max-w-xl mx-auto px-4 py-12">
	<div class="text-center mb-8">
		<Package class="size-12 mx-auto mb-4 text-[var(--color-primary)]" />
		<h1 class="text-2xl font-bold text-[var(--color-text)]">Track Your Order</h1>
		<p class="text-sm text-[var(--color-text-secondary)] mt-1">Enter your order number and email to check status.</p>
	</div>

	<Card class="bg-[var(--color-surface)] border-[var(--color-border)]">
		<CardContent class="p-6 space-y-4">
			<div>
				<label for="orderNumber" class="text-sm font-medium text-[var(--color-text)] mb-1.5 block">Order Number</label>
				<Input
					id="orderNumber"
					bind:value={orderNumber}
					placeholder="e.g. ORD-ABC123"
					class="bg-[var(--color-bg)] border-[var(--color-border)]"
					onkeydown={(e) => e.key === 'Enter' && trackOrder()}
				/>
			</div>
			<div>
				<label for="trackEmail" class="text-sm font-medium text-[var(--color-text)] mb-1.5 block">Email Address</label>
				<Input
					id="trackEmail"
					bind:value={email}
					type="email"
					placeholder="you@example.com"
					class="bg-[var(--color-bg)] border-[var(--color-border)]"
					onkeydown={(e) => e.key === 'Enter' && trackOrder()}
				/>
			</div>
			<Button class="w-full" onclick={trackOrder} disabled={loading}>
				<Search class="size-4 mr-2" />
				{loading ? 'Tracking...' : 'Track Order'}
			</Button>
		</CardContent>
	</Card>

	{#if order}
		{@const Icon = statusIcon(order.status)}
		<Card class="mt-6 bg-[var(--color-surface)] border-[var(--color-border)]">
			<CardHeader>
				<CardTitle class="text-base">Order #{order.orderNumber}</CardTitle>
			</CardHeader>
			<CardContent class="p-6 space-y-6">
				<div class="flex items-center gap-3">
					<Icon class="size-6 text-[var(--color-primary)]" />
					<div>
						<p class="text-sm font-medium text-[var(--color-text)]">Status</p>
						<Badge class="{statusColor(order.status)} capitalize">{order.status}</Badge>
					</div>
					<div class="ml-auto text-right">
						<p class="text-sm font-medium text-[var(--color-text)]">{formatPrice(order.total)}</p>
						<p class="text-xs text-[var(--color-text-secondary)]">{order.currency}</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p class="text-[var(--color-text-secondary)]">Ordered</p>
						<p class="font-medium text-[var(--color-text)]">{formatDate(order.createdAt)}</p>
					</div>
					<div>
						<p class="text-[var(--color-text-secondary)]">Email</p>
						<p class="font-medium text-[var(--color-text)]">{order.email}</p>
					</div>
					{#if order.shippingAddressLine1}
						<div class="col-span-2">
							<p class="text-[var(--color-text-secondary)]">Shipping Address</p>
							<p class="font-medium text-[var(--color-text)]">
								{[order.shippingFirstName, order.shippingLastName].filter(Boolean).join(' ')} · {order.shippingAddressLine1}
								{order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ''}
								· {order.shippingCity}{order.shippingState ? `, ${order.shippingState}` : ''} {order.shippingPostalCode || ''}
							</p>
						</div>
					{/if}
				</div>

				{#if order.items?.length > 0}
					<div class="border-t border-[var(--color-border)] pt-4">
						<p class="text-sm font-medium text-[var(--color-text)] mb-3">Items</p>
						<div class="space-y-2">
							{#each order.items as item}
								<div class="flex items-center gap-3">
									{#if item.productImage}
										<img src={item.productImage} alt={item.productTitle} class="size-10 rounded object-cover bg-[var(--color-bg)]" />
									{:else}
										<div class="size-10 rounded bg-[var(--color-bg)] flex items-center justify-center"><Package class="size-4 text-[var(--color-text-secondary)]" /></div>
									{/if}
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-[var(--color-text)] truncate">{item.productTitle}</p>
										{#if item.variantName}
											<p class="text-xs text-[var(--color-text-secondary)]">{item.variantName}</p>
										{/if}
									</div>
									<div class="text-right">
										<p class="text-sm font-medium text-[var(--color-text)]">×{item.quantity}</p>
										<p class="text-xs text-[var(--color-text-secondary)]">{formatPrice(item.total)}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
