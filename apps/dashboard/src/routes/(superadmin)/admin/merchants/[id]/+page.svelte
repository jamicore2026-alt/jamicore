<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import Globe from '@lucide/svelte/icons/globe';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Ban from '@lucide/svelte/icons/ban';

	let { data } = $props();
	let merchant = $derived(data.merchant);
	let updating = $state(false);

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		active: 'bg-success/15 text-success border-success/30',
		suspended: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	async function updateStatus(status: string) {
		updating = true;
		try {
			const endpoint = status === 'active'
				? (merchant.status === 'suspended' ? 'reactivate' : 'approve')
				: 'suspend';
			await apiFetch(`/admin/merchants/${merchant.id}/${endpoint}`, {
				method: 'PATCH',
			});
			toast.success(`Merchant ${status === 'active' ? 'approved' : status}`);
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update');
		} finally {
			updating = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-6 max-w-4xl">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="sm" href="/admin/merchants" class="gap-2">
			<ArrowLeft class="w-4 h-4" />
			Back
		</Button>
		<div class="flex-1">
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold tracking-tight">{merchant.name}</h1>
				<Badge class={statusColors[merchant.status] || ''} >{merchant.status}</Badge>
			</div>
			<p class="text-muted-foreground">{merchant.domain}</p>
		</div>
	</div>

	<div class="grid md:grid-cols-2 gap-6">
		<!-- Store Details -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-base">
					<Building2 class="w-4 h-4" />
					Store Information
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3 text-sm">
				<div class="flex items-center gap-2">
					<Globe class="w-4 h-4 text-muted-foreground" />
					<span>{merchant.domain}</span>
				</div>
				<div class="flex items-center gap-2">
					<Mail class="w-4 h-4 text-muted-foreground" />
					<span>{merchant.ownerEmail}</span>
				</div>
				{#if merchant.ownerPhone}
					<div class="flex items-center gap-2">
						<Phone class="w-4 h-4 text-muted-foreground" />
						<span>{merchant.ownerPhone}</span>
					</div>
				{/if}
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Created</span>
					<span>{formatDate(merchant.createdAt)}</span>
				</div>
				{#if merchant.plan}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Plan</span>
						<Badge variant="secondary">{merchant.plan.name}</Badge>
					</div>
				{/if}
				{#if merchant.planExpiresAt}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Plan Expires</span>
						<span>{formatDate(merchant.planExpiresAt)}</span>
					</div>
				{/if}
				<div class="flex justify-between">
					<span class="text-muted-foreground">Approved</span>
					<span>{merchant.isApproved ? 'Yes' : 'No'}</span>
				</div>
			</CardContent>
		</Card>

		<!-- Actions -->
		<Card>
			<CardHeader>
				<CardTitle class="text-base">Actions</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if merchant.status === 'pending'}
					<Button
						class="w-full gap-2 bg-success hover:bg-success/90"
						onclick={() => updateStatus('active')}
						disabled={updating}
					>
						<CheckCircle class="w-4 h-4" />
						Approve Merchant
					</Button>
					<Button
						variant="destructive"
						class="w-full gap-2"
						onclick={() => updateStatus('suspended')}
						disabled={updating}
					>
						<XCircle class="w-4 h-4" />
						Reject
					</Button>
				{:else if merchant.status === 'active'}
					<Button
						variant="destructive"
						class="w-full gap-2"
						onclick={() => { if (confirm('Suspend this merchant?')) updateStatus('suspended'); }}
						disabled={updating}
					>
						<Ban class="w-4 h-4" />
						Suspend Merchant
					</Button>
				{:else if merchant.status === 'suspended'}
					<Button
						class="w-full gap-2 bg-success hover:bg-success/90"
						onclick={() => updateStatus('active')}
						disabled={updating}
					>
						<CheckCircle class="w-4 h-4" />
						Reactivate
					</Button>
				{/if}

				<Separator />

				<!-- Stats summary -->
				<div class="space-y-2 pt-2">
					<p class="text-sm font-medium text-muted-foreground">Quick Stats</p>
					<div class="grid grid-cols-2 gap-3">
						<div class="p-3 rounded-lg bg-muted/50 text-center">
							<p class="text-2xl font-bold">{merchant.productsCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Products</p>
						</div>
						<div class="p-3 rounded-lg bg-muted/50 text-center">
							<p class="text-2xl font-bold">{merchant.ordersCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Orders</p>
						</div>
						<div class="p-3 rounded-lg bg-muted/50 text-center">
							<p class="text-2xl font-bold">{merchant.customersCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Customers</p>
						</div>
						<div class="p-3 rounded-lg bg-muted/50 text-center">
							<p class="text-2xl font-bold">{merchant.staffCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Staff</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
