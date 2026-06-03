<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage, errorCode } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Activity from '@lucide/svelte/icons/activity';
	import Zap from '@lucide/svelte/icons/zap';

	let { data } = $props();

	interface PlanItem {
		id: string;
		name: string;
		price: string | number;
		billingPeriod: string;
		productLimit: number | null;
		staffLimit: number | null;
		storageLimit: number | null;
		description: string | null;
		features: string[] | string | null;
		isActive: boolean;
	}

	let showDialog = $state(false);
	let editingPlan = $state<PlanItem | null>(null);
	let saving = $state(false);

	let form = $state({
		name: '', price: '', billingPeriod: 'monthly', productLimit: '',
		staffLimit: '', storageLimit: '', description: '', features: '', isActive: true,
	});

	function openCreate() {
		editingPlan = null;
		form = { name: '', price: '', billingPeriod: 'monthly', productLimit: '', staffLimit: '', storageLimit: '', description: '', features: '', isActive: true };
		showDialog = true;
	}

	function openEdit(plan: PlanItem) {
		editingPlan = plan;
		form = {
			name: plan.name, price: String(plan.price), billingPeriod: plan.billingPeriod || 'monthly',
			productLimit: String(plan.productLimit || ''), staffLimit: String(plan.staffLimit || ''),
			storageLimit: String(plan.storageLimit || ''), description: plan.description || '',
			features: Array.isArray(plan.features) ? plan.features.join(', ') : (plan.features || ''),
			isActive: plan.isActive ?? true,
		};
		showDialog = true;
	}

	async function handleSave() {
		if (!form.name || !form.price) { toast.error('Name and price required'); return; }
		saving = true;
		try {
			const payload: Record<string, any> = {
				name: form.name, price: form.price, billingPeriod: form.billingPeriod, isActive: form.isActive,
			};
			if (form.productLimit) payload.productLimit = Number(form.productLimit);
			if (form.staffLimit) payload.staffLimit = Number(form.staffLimit);
			if (form.storageLimit) payload.storageLimit = Number(form.storageLimit);
			if (form.description) payload.description = form.description;
			if (form.features) payload.features = form.features.split(',').map((f: string) => f.trim());

			if (editingPlan) {
				await apiFetch(`/admin/plans/${editingPlan.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
				toast.success('Plan updated');
			} else {
				await apiFetch('/admin/plans', { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Plan created');
			}
			showDialog = false;
			invalidateAll();
		} catch (err) { toast.error(errorMessage(err) || 'Failed'); }
		finally { saving = false; }
	}

	async function deletePlan(id: string) {
		if (!confirm('Delete this plan? Existing subscribers will not be affected.')) return;
		try {
			await apiFetch(`/admin/plans/${id}`, { method: 'DELETE' });
			toast.success('Deleted');
			invalidateAll();
		} catch (err) {
			if (errorCode(err) === 'PLAN_NOT_FOUND') {
				toast.error('Plan already deleted. Refreshing...');
			} else {
				toast.error(errorMessage(err) || 'Failed to delete');
			}
			invalidateAll();
		}
	}
</script>

<div class="space-y-8 stagger-children">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Activity class="w-4 h-4 text-primary" />
				<span class="text-[11px] font-mono uppercase tracking-widest text-primary">Billing</span>
			</div>
			<h1 class="text-3xl font-bold tracking-tight font-heading">Subscription Plans</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage pricing plans for merchants.</p>
		</div>
		<Button onclick={openCreate} class="gap-2 shrink-0"><Plus class="w-4 h-4" />Create Plan</Button>
	</div>

	{#if !data.plans || data.plans.length === 0}
		<Card class="glass-card">
			<CardContent class="py-16 text-center">
				<div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4" style="box-shadow: 0 0 24px rgba(6,182,212,0.05);">
					<CreditCard class="h-7 w-7 text-muted-foreground/40" />
				</div>
				<p class="text-muted-foreground font-medium font-heading">No plans configured</p>
				<Button onclick={openCreate} class="mt-4 gap-2"><Plus class="w-4 h-4" />Create Plan</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each data.plans as plan (plan.id)}
				<Card class="glass-card relative overflow-hidden group">
					<div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<div class="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] opacity-10 group-hover:opacity-30 transition-opacity" style="background: rgba(6,182,212,0.15);"></div>
					<CardHeader class="pb-2 relative z-10">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<CardTitle class="truncate">{plan.name}</CardTitle>
								<CardDescription class="truncate">{plan.description || 'No description'}</CardDescription>
							</div>
							{#if !plan.isActive}
								<Badge variant="secondary" class="shrink-0">Inactive</Badge>
							{/if}
						</div>
					</CardHeader>
					<CardContent class="space-y-4 relative z-10">
						<div class="flex items-baseline gap-1">
							<span class="text-3xl font-bold font-heading">${Number(plan.price).toFixed(2)}</span>
							<span class="text-muted-foreground">/{plan.billingPeriod || 'month'}</span>
						</div>

						<div class="space-y-2 text-sm">
							{#if plan.productLimit}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Products</span>
									<span class="font-medium">{plan.productLimit}</span>
								</div>
							{/if}
							{#if plan.staffLimit}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Staff</span>
									<span class="font-medium">{plan.staffLimit}</span>
								</div>
							{/if}
							{#if plan.storageLimit}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Storage</span>
									<span class="font-medium">{plan.storageLimit} MB</span>
								</div>
							{/if}
						</div>

						{#if plan.features}
							<div class="space-y-1">
								{#each (Array.isArray(plan.features) ? plan.features : []) as feature}
									<p class="text-sm text-muted-foreground"><span class="text-primary"><Zap class="w-3 h-3 inline mr-1" /></span>{feature}</p>
								{/each}
							</div>
						{/if}

						<div class="flex flex-wrap gap-2 pt-2">
							<Button variant="outline" size="sm" class="flex-1 gap-1 border-[rgba(30,58,95,0.4)] hover:bg-primary/5 hover:border-primary/30 transition-all" onclick={() => openEdit(plan)}>
								<Pencil class="w-3 h-3" />Edit
							</Button>
							<Button variant="outline" size="sm" class="gap-1 text-destructive hover:bg-destructive/10 border-[rgba(30,58,95,0.4)]" onclick={() => deletePlan(plan.id)}>
								<Trash2 class="w-3 h-3" />
							</Button>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header><Dialog.Title>{editingPlan ? 'Edit Plan' : 'Create Plan'}</Dialog.Title></Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2"><Label for="planName">Name *</Label><Input id="planName" bind:value={form.name} placeholder="e.g. Pro" required /></div>
				<div class="space-y-2"><Label for="planPrice">Price *</Label><Input id="planPrice" type="number" step="0.01" bind:value={form.price} required /></div>
			</div>
			<div class="space-y-2"><Label for="desc">Description</Label><Textarea id="desc" bind:value={form.description} rows={2} /></div>
			<div class="grid grid-cols-3 gap-4">
				<div class="space-y-2"><Label for="prodLimit">Product Limit</Label><Input id="prodLimit" type="number" bind:value={form.productLimit} /></div>
				<div class="space-y-2"><Label for="staffLim">Staff Limit</Label><Input id="staffLim" type="number" bind:value={form.staffLimit} /></div>
				<div class="space-y-2"><Label for="storageLim">Storage (MB)</Label><Input id="storageLim" type="number" bind:value={form.storageLimit} /></div>
			</div>
			<div class="space-y-2"><Label for="features">Features (comma-separated)</Label><Input id="features" bind:value={form.features} placeholder="Feature 1, Feature 2" /></div>
			<div class="flex items-center justify-between"><Label>Active</Label><Switch bind:checked={form.isActive} /></div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingPlan ? 'Update' : 'Create'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
