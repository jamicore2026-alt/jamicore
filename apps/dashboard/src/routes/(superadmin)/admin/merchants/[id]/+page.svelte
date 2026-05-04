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
		import CheckCircle from '@lucide/svelte/icons/check-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Ban from '@lucide/svelte/icons/ban';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Save from '@lucide/svelte/icons/save';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();
	let merchant = $derived(data.merchant);
	let plans = $derived(data.plans || []);
	let updating = $state(false);
	let savingPlan = $state(false);

	let planForm = $state({
		planId: data.merchant?.planId || '',
		planExpiresAt: data.merchant?.planExpiresAt ? data.merchant.planExpiresAt.split('T')[0] : '',
	});

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
		active: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
		suspended: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
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

	async function savePlan() {
		savingPlan = true;
		try {
			const payload: Record<string, unknown> = {};
			if (planForm.planId) payload.planId = planForm.planId;
			if (planForm.planExpiresAt) payload.planExpiresAt = new Date(planForm.planExpiresAt).toISOString();
			await apiFetch(`/admin/stores/${merchant.id}`, {
				method: 'PATCH',
				body: JSON.stringify(payload),
			});
			toast.success('Subscription updated');
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update subscription');
		} finally {
			savingPlan = false;
		}
	}
</script>

<div class="space-y-8 stagger-children max-w-4xl">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="sm" href="/admin/merchants" class="gap-2 border-[rgba(30,58,95,0.4)] hover:bg-primary/5 hover:border-primary/30 transition-all">
			<ArrowLeft class="w-4 h-4" />
			Back
		</Button>
		<div class="flex-1">
			<div class="flex items-center gap-2 mb-1">
				<Building2 class="w-4 h-4 text-primary" />
				<span class="text-[11px] font-mono uppercase tracking-widest text-primary">Merchant Profile</span>
			</div>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold tracking-tight font-heading">{merchant.name}</h1>
				<Badge class={statusColors[merchant.status] || ''} >{merchant.status}</Badge>
			</div>
			<p class="text-muted-foreground mt-1 text-sm">{merchant.domain}</p>
		</div>
	</div>

	<div class="grid md:grid-cols-2 gap-6">
		<!-- Store Details -->
		<Card class="glass-card">
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
				<Separator class="bg-[rgba(30,58,95,0.3)]" />
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
		<Card class="glass-card">
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

				<Separator class="bg-[rgba(30,58,95,0.3)]" />

				<!-- Stats summary -->
				<div class="space-y-2 pt-2">
					<p class="text-sm font-medium text-muted-foreground">Quick Stats</p>
					<div class="grid grid-cols-2 gap-3">
						<div class="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
							<p class="text-2xl font-bold">{merchant.productsCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Products</p>
						</div>
						<div class="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
							<p class="text-2xl font-bold">{merchant.ordersCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Orders</p>
						</div>
						<div class="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
							<p class="text-2xl font-bold">{merchant.customersCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Customers</p>
						</div>
						<div class="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
							<p class="text-2xl font-bold">{merchant.staffCount ?? '—'}</p>
							<p class="text-xs text-muted-foreground">Staff</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Subscription Management -->
	<Card class="glass-card">
		<CardHeader>
			<CardTitle class="flex items-center gap-2 text-base">
				<CreditCard class="w-4 h-4" />
				Subscription
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if merchant.plan}
				<div class="flex items-center gap-2 text-sm">
					<span class="text-muted-foreground">Current Plan:</span>
					<Badge variant="secondary">{merchant.plan.name}</Badge>
					<span class="text-muted-foreground ml-2">${merchant.plan.price} / {merchant.plan.interval}</span>
				</div>
			{/if}

			<div class="grid md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="plan">Plan</Label>
					<Select.Root type="single" value={planForm.planId} onValueChange={(v) => (planForm.planId = v)}>
						<Select.Trigger class="w-full">
							{plans.find((p: any) => p.id === planForm.planId)?.name || 'Select a plan'}
						</Select.Trigger>
						<Select.Content>
							{#each plans as plan}
								<Select.Item value={plan.id}>{plan.name} — ${plan.price} / {plan.interval}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="expires">Plan Expires</Label>
					<Input
						id="expires"
						type="date"
						value={planForm.planExpiresAt}
						onchange={(e) => (planForm.planExpiresAt = (e.target as HTMLInputElement).value)}
					/>
				</div>
			</div>

			<div class="flex justify-end">
				<Button onclick={savePlan} disabled={savingPlan} class="gap-2">
					<Save class="w-4 h-4" />
					{savingPlan ? 'Saving...' : 'Update Subscription'}
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
