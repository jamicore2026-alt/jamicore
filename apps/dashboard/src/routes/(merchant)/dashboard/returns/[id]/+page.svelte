<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Package from '@lucide/svelte/icons/package';
	import Calendar from '@lucide/svelte/icons/calendar';
	import User from '@lucide/svelte/icons/user';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';

	let { data } = $props();

	const ret = $derived(data.returnRequest);
	let updating = $state(false);
	let adminNotes = $state.raw(ret?.adminNotes || '');

	const statusColors: Record<string, string> = {
		requested: 'bg-warning/15 text-warning border-warning/30',
		approved: 'bg-info/15 text-info border-info/30',
		received: 'bg-primary/15 text-primary border-primary/30',
		inspected: 'bg-secondary/15 text-secondary border-secondary/30',
		refunded: 'bg-success/15 text-success border-success/30',
		rejected: 'bg-destructive/15 text-destructive border-destructive/30',
		cancelled: 'bg-muted/15 text-muted-foreground border-muted/30',
	};

	const validTransitions: Record<string, string[]> = {
		requested: ['approved', 'rejected', 'cancelled'],
		approved: ['received', 'cancelled'],
		received: ['inspected'],
		inspected: ['refunded', 'rejected'],
		rejected: [],
		refunded: [],
		cancelled: [],
	};

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p || 0).toFixed(2)}`;
	}

	async function updateStatus(status: string) {
		updating = true;
		try {
			await apiFetch(`/merchant/returns/${ret.id}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status, adminNotes: adminNotes || undefined }),
			});
			toast.success(`Status updated to ${status}`);
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update status');
		} finally {
			updating = false;
		}
	}

	const availableStatuses = $derived(validTransitions[ret?.status] || []);
</script>

<div class="space-y-6 max-w-4xl">
	<div class="flex items-center gap-3">
		<Button variant="outline" size="icon" onclick={() => goto('/dashboard/returns')}>
			<ArrowLeft class="w-4 h-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Return Details</h1>
			<p class="text-muted-foreground text-sm">Order #{ret?.order?.orderNumber || ret?.orderId?.slice(0, 8)}</p>
		</div>
	</div>

	{#if !ret}
		<Card>
			<CardContent class="py-12 text-center text-muted-foreground">
				<Package class="w-12 h-12 mx-auto mb-3 opacity-50" />
				<p class="font-medium">Return not found.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid md:grid-cols-3 gap-6">
			<div class="md:col-span-2 space-y-4">
				<!-- Return Info -->
				<Card>
					<CardHeader>
						<div class="flex items-start justify-between gap-3">
							<div>
								<CardTitle class="text-lg">Return #{ret.id?.slice(0, 8)}</CardTitle>
								<p class="text-sm text-muted-foreground mt-1">
									<ShoppingCart class="w-3 h-3 inline mr-1" />
									Order #{ret.order?.orderNumber || ret.orderId?.slice(0, 8)}
								</p>
							</div>
							<Badge class={statusColors[ret.status]}>{ret.status}</Badge>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Customer</p>
								<p class="text-sm font-medium flex items-center gap-1">
									<User class="w-4 h-4 text-muted-foreground" />
									{ret.customer?.email || '—'}
								</p>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Submitted</p>
								<p class="text-sm font-medium flex items-center gap-1">
									<Calendar class="w-4 h-4 text-muted-foreground" />
									{formatDate(ret.createdAt)}
								</p>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Reason</p>
								<p class="text-sm font-medium">{ret.reason}</p>
							</div>
							{#if ret.refundAmount}
								<div class="space-y-1">
									<p class="text-xs text-muted-foreground">Refund Amount</p>
									<p class="text-sm font-medium">{formatPrice(ret.refundAmount)}</p>
								</div>
							{/if}
						</div>
						{#if ret.notes}
							<Separator />
							<div>
								<p class="text-xs text-muted-foreground mb-1">Customer Notes</p>
								<p class="text-sm">{ret.notes}</p>
							</div>
						{/if}
						{#if ret.adminNotes}
							<Separator />
							<div>
								<p class="text-xs text-muted-foreground mb-1">Admin Notes</p>
								<p class="text-sm">{ret.adminNotes}</p>
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Items -->
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Return Items</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						{#if !ret.items || ret.items.length === 0}
							<p class="text-sm text-muted-foreground text-center py-4">No items in this return.</p>
						{:else}
							{#each ret.items as item}
								<div class="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
									<div class="h-10 w-10 rounded bg-background flex items-center justify-center shrink-0">
										<Package class="w-4 h-4 text-muted-foreground" />
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium truncate">
											{item.orderItem?.productTitle || 'Unknown Product'}
										</p>
										<p class="text-xs text-muted-foreground">
											Qty: {item.quantity}
											{#if item.condition}· Condition: {item.condition}{/if}
											{#if item.refundAmount}· Refund: {formatPrice(item.refundAmount)}{/if}
										</p>
									</div>
									{#if item.reason}
										<Badge variant="outline" class="shrink-0 text-xs">{item.reason}</Badge>
									{/if}
								</div>
							{/each}
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- Actions -->
			<div class="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Actions</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if availableStatuses.length > 0}
							<div class="space-y-2">
								<p class="text-sm font-medium">Update Status</p>
								<Select.Root type="single" value="" onValueChange={(v) => { if (v) updateStatus(v); }}>
									<Select.Trigger class="w-full" disabled={updating}>
										{updating ? 'Updating...' : 'Select new status'}
									</Select.Trigger>
									<Select.Content>
										{#each availableStatuses as s}
											<Select.Item value={s}>
												{s.charAt(0).toUpperCase() + s.slice(1)}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							<div class="space-y-2">
								<p class="text-sm font-medium">Admin Notes</p>
								<Textarea bind:value={adminNotes} rows={3} placeholder="Add internal notes..." />
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">No further actions available for this return.</p>
						{/if}

						<!-- Timeline -->
						<div class="space-y-2 pt-2">
							<p class="text-sm font-medium text-muted-foreground">Timeline</p>
							<div class="space-y-1 text-xs text-muted-foreground">
								<p>Submitted: {formatDate(ret.createdAt)}</p>
								{#if ret.receivedAt}<p>Received: {formatDate(ret.receivedAt)}</p>{/if}
								{#if ret.inspectedAt}<p>Inspected: {formatDate(ret.inspectedAt)}</p>{/if}
								{#if ret.refundedAt}<p>Refunded: {formatDate(ret.refundedAt)}</p>{/if}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	{/if}
</div>
