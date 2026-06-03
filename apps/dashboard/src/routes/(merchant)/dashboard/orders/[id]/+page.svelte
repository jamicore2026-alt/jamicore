<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Package from '@lucide/svelte/icons/package';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import User from '@lucide/svelte/icons/user';
	import CreditCard from '@lucide/svelte/icons/credit-card';

	let { data } = $props();
	let order = $derived(data.order);

	let updatingStatus = $state(false);

	const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		processing: 'bg-info/15 text-info border-info/30',
		shipped: 'bg-primary/15 text-primary border-primary/30',
		delivered: 'bg-success/15 text-success border-success/30',
		cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	async function updateStatus(newStatus: string) {
		updatingStatus = true;
		try {
			await apiFetch(`/merchant/orders/${order.id}/status`, {
				method: 'PATCH',
				body: JSON.stringify({ status: newStatus }),
			});
			toast.success(`Order status updated to ${newStatus}`);
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to update status');
		} finally {
			updatingStatus = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p).toFixed(2)}`;
	}
</script>

<div class="space-y-6 max-w-5xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" href="/dashboard/orders" class="gap-2">
				<ArrowLeft class="w-4 h-4" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
				<p class="text-muted-foreground">{formatDate(order.createdAt)}</p>
			</div>
		</div>
		<Badge class={`text-sm px-3 py-1 ${statusColors[order.status] || ''}`}>
			{order.status}
		</Badge>
	</div>

	<div class="grid md:grid-cols-3 gap-6">
		<!-- Main Column -->
		<div class="md:col-span-2 space-y-6">
			<!-- Status Update -->
			<Card class="overflow-visible">
				<CardHeader>
					<CardTitle class="text-base">Update Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="flex gap-3">
						<Select.Root type="single" value={order.status} onValueChange={(v) => updateStatus(v)}>
							<Select.Trigger class="w-48 capitalize" disabled={updatingStatus}>
								{order.status}
							</Select.Trigger>
							<Select.Content class="z-50">
								{#each statusOptions as s}
									<Select.Item value={s}><span class="capitalize">{s}</span></Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</CardContent>
			</Card>

			<!-- Order Items -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Package class="w-5 h-5" />
						Items ({order.items?.length || 0})
					</CardTitle>
				</CardHeader>
				<CardContent class="p-0">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Product</Table.Head>
								<Table.Head class="text-center">Qty</Table.Head>
								<Table.Head class="text-right">Price</Table.Head>
								<Table.Head class="text-right">Total</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each order.items || [] as item (item.id)}
								<Table.Row>
									<Table.Cell>
										<div class="flex items-center gap-3">
											{#if item.productImage}
												<img src={item.productImage} alt={item.productTitle} class="w-10 h-10 rounded object-cover" />
											{/if}
											<div>
												<p class="font-medium">{item.productTitle}</p>
												{#if item.variantName}
													<p class="text-xs text-muted-foreground">{item.variantName}</p>
												{/if}
											</div>
										</div>
									</Table.Cell>
									<Table.Cell class="text-center">{item.quantity}</Table.Cell>
									<Table.Cell class="text-right">{formatPrice(item.price)}</Table.Cell>
									<Table.Cell class="text-right font-medium">{formatPrice(item.total)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</CardContent>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Totals -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<CreditCard class="w-4 h-4" />
						Summary
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Subtotal</span>
						<span>{formatPrice(order.subtotal)}</span>
					</div>
					{#if Number(order.discount) > 0}
						<div class="flex justify-between text-sm text-success">
							<span>Discount</span>
							<span>-{formatPrice(order.discount)}</span>
						</div>
					{/if}
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Shipping</span>
						<span>{formatPrice(order.shipping || 0)}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Tax</span>
						<span>{formatPrice(order.tax || 0)}</span>
					</div>
					<Separator />
					<div class="flex justify-between font-bold text-lg">
						<span>Total</span>
						<span>{formatPrice(order.total)}</span>
					</div>
					<Separator />
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Payment</span>
						<Badge variant="outline" class="capitalize">{order.paymentStatus}</Badge>
					</div>
					{#if order.couponCode}
						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Coupon</span>
							<Badge variant="secondary">{order.couponCode}</Badge>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Customer -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<User class="w-4 h-4" />
						Customer
					</CardTitle>
				</CardHeader>
				<CardContent class="text-sm space-y-1">
					<p class="font-medium">{order.email}</p>
					{#if order.phone}
						<p class="text-muted-foreground">{order.phone}</p>
					{/if}
				</CardContent>
			</Card>

			<!-- Shipping Address -->
			{#if order.shippingAddressLine1}
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2 text-base">
							<MapPin class="w-4 h-4" />
							Shipping
						</CardTitle>
					</CardHeader>
					<CardContent class="text-sm space-y-1">
						{#if order.shippingFirstName}
							<p class="font-medium">{order.shippingFirstName} {order.shippingLastName || ''}</p>
						{/if}
						<p>{order.shippingAddressLine1}</p>
						{#if order.shippingAddressLine2}<p>{order.shippingAddressLine2}</p>{/if}
						<p>{order.shippingCity}{order.shippingState ? `, ${order.shippingState}` : ''} {order.shippingPostalCode || ''}</p>
						<p>{order.shippingCountry}</p>
					</CardContent>
				</Card>
			{/if}

			<!-- Notes -->
			{#if order.notes || order.adminNotes}
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Notes</CardTitle>
					</CardHeader>
					<CardContent class="text-sm space-y-2">
						{#if order.notes}
							<div>
								<p class="text-muted-foreground text-xs">Customer note</p>
								<p>{order.notes}</p>
							</div>
						{/if}
						{#if order.adminNotes}
							<div>
								<p class="text-muted-foreground text-xs">Admin note</p>
								<p>{order.adminNotes}</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			{/if}
		</div>
	</div>
</div>
