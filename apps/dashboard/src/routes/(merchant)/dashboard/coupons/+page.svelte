<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Ticket from '@lucide/svelte/icons/ticket';

	let { data } = $props();

	interface Coupon {
		id: string;
		code: string;
		discountType: string;
		discountValue: string | number;
		minOrderAmount: string | number | null;
		usageLimit: number | null;
		usageLimitPerCustomer: number | null;
		startDate: string | null;
		endDate: string | null;
		isActive: boolean;
	}

	let showDialog = $state(false);
	let editingCoupon = $state<Coupon | null>(null);
	let saving = $state(false);

	// UI-008: per-field error state. We render these inline under each input
	// and only fall back to toast.error for network/server errors.
	let formErrors = $state<Record<string, string>>({});

	let form = $state({
		code: '', discountType: 'Percent', discountValue: '', minOrderAmount: '',
		usageLimit: '', usageLimitPerCustomer: '', startDate: '', endDate: '', isActive: true,
	});

	function resetForm() {
		form = { code: '', discountType: 'Percent', discountValue: '', minOrderAmount: '', usageLimit: '', usageLimitPerCustomer: '', startDate: '', endDate: '', isActive: true };
		formErrors = {};
	}

	function openCreate() {
		editingCoupon = null;
		resetForm();
		showDialog = true;
	}

	function openEdit(c: Coupon) {
		editingCoupon = c;
		form = {
			code: c.code, discountType: c.discountType || 'Percent', discountValue: String(c.discountValue),
			minOrderAmount: String(c.minOrderAmount || ''), usageLimit: String(c.usageLimit || ''),
			usageLimitPerCustomer: String(c.usageLimitPerCustomer || ''),
			startDate: c.startDate?.split('T')[0] || '', endDate: c.endDate?.split('T')[0] || '',
			isActive: c.isActive ?? true,
		};
		formErrors = {};
		showDialog = true;
	}

	function validateForm(): boolean {
		const errors: Record<string, string> = {};
		if (!form.code?.trim()) errors.code = 'Code is required';
		if (!form.discountValue || Number(form.discountValue) <= 0) errors.discountValue = 'Discount value must be greater than 0';
		if (form.endDate && form.startDate && new Date(form.endDate) <= new Date(form.startDate)) {
			errors.endDate = 'End date must be after start date';
		}
		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function handleSave() {
		// UI-008: validate locally and show inline field errors. Only fall back
		// to toast.error for actual network/server errors.
		if (!validateForm()) return;
		saving = true;
		try {
			const payload: Record<string, any> = {
				code: form.code.toUpperCase(), discountType: form.discountType,
				discountValue: form.discountValue, isActive: form.isActive,
			};
			if (form.minOrderAmount) payload.minOrderAmount = form.minOrderAmount;
			if (form.usageLimit) payload.usageLimit = Number(form.usageLimit);
			if (form.usageLimitPerCustomer) payload.usageLimitPerCustomer = Number(form.usageLimitPerCustomer);
			if (form.startDate) payload.startDate = new Date(form.startDate).toISOString();
			if (form.endDate) payload.endDate = new Date(form.endDate).toISOString();

			if (editingCoupon) {
				await apiFetch(`/merchant/coupons/${editingCoupon.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
				toast.success('Coupon updated');
			} else {
				await apiFetch('/merchant/coupons', { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Coupon created');
			}
			showDialog = false;
			invalidateAll();
		} catch (err) { toast.error(errorMessage(err) || 'Failed to save'); }
		finally { saving = false; }
	}

	async function deleteCoupon(id: string) {
		if (!confirm('Delete this coupon?')) return;
		try { await apiFetch(`/merchant/coupons/${id}`, { method: 'DELETE' }); toast.success('Deleted'); invalidateAll(); }
		catch { toast.error('Failed to delete'); }
	}

	function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'; }

	function isExpired(endDate: string) { return endDate && new Date(endDate) < new Date(); }
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Coupons</h1>
			<p class="text-muted-foreground">Create and manage discount codes</p>
		</div>
		<Button onclick={openCreate} class="gap-2"><Plus class="w-4 h-4" />Create Coupon</Button>
	</div>

	<Card>
		<CardContent class="p-0">
			{#if !data.coupons || data.coupons.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Ticket class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No coupons yet</p>
					<Button onclick={openCreate} class="mt-4 gap-2"><Plus class="w-4 h-4" />Create Coupon</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Code</Table.Head>
							<Table.Head>Discount</Table.Head>
							<Table.Head>Min Order</Table.Head>
							<Table.Head class="text-center">Usage</Table.Head>
							<Table.Head>Valid Until</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-right w-24">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.coupons as coupon (coupon.id)}
							<Table.Row>
								<Table.Cell class="font-mono font-bold">{coupon.code}</Table.Cell>
								<Table.Cell>
									{coupon.discountType === 'Percent' ? `${coupon.discountValue}%` : `$${Number(coupon.discountValue).toFixed(2)}`}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{coupon.minOrderAmount ? `$${Number(coupon.minOrderAmount).toFixed(2)}` : '—'}
								</Table.Cell>
								<Table.Cell class="text-center">
									{coupon.usageCount || 0}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(coupon.endDate)}</Table.Cell>
								<Table.Cell class="text-center">
									{#if !coupon.isActive}
										<Badge variant="secondary">Inactive</Badge>
									{:else if isExpired(coupon.endDate)}
										<Badge class="bg-destructive/15 text-destructive border-destructive/30">Expired</Badge>
									{:else}
										<Badge class="bg-success/15 text-success border-success/30">Active</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => openEdit(coupon)}
											aria-label={`Edit coupon ${coupon.code}`}
											class="p-1.5 rounded hover:bg-muted"
										>
											<Pencil class="w-4 h-4 text-muted-foreground" />
										</button>
										<button
											onclick={() => deleteCoupon(coupon.id)}
											aria-label={`Delete coupon ${coupon.code}`}
											class="p-1.5 rounded hover:bg-destructive/10"
										>
											<Trash2 class="w-4 h-4 text-destructive" />
										</button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</CardContent>
	</Card>
</div>

<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</Dialog.Title>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="couponCode">Code *</Label>
				<Input
					id="couponCode"
					bind:value={form.code}
					placeholder="SUMMER20"
					class="font-mono uppercase"
					aria-invalid={formErrors.code ? 'true' : undefined}
					aria-describedby={formErrors.code ? 'couponCode-error' : undefined}
				/>
				{#if formErrors.code}
					<p id="couponCode-error" class="text-sm text-destructive">{formErrors.code}</p>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>Discount Type</Label>
					<Select.Root type="single" value={form.discountType} onValueChange={(v) => form.discountType = v}>
						<Select.Trigger class="w-full">{form.discountType}</Select.Trigger>
						<Select.Content class="z-50">
							<Select.Item value="Percent">Percentage</Select.Item>
							<Select.Item value="Fixed">Fixed Amount</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label for="discountVal">Value *</Label>
					<Input
						id="discountVal"
						type="number"
						step="0.01"
						bind:value={form.discountValue}
						aria-invalid={formErrors.discountValue ? 'true' : undefined}
						aria-describedby={formErrors.discountValue ? 'discountVal-error' : undefined}
					/>
					{#if formErrors.discountValue}
						<p id="discountVal-error" class="text-sm text-destructive">{formErrors.discountValue}</p>
					{/if}
				</div>
			</div>
			<div class="space-y-2">
				<Label for="minOrder">Minimum Order Amount</Label>
				<Input id="minOrder" type="number" step="0.01" bind:value={form.minOrderAmount} placeholder="0.00" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2"><Label for="usageLimit">Total Usage Limit</Label><Input id="usageLimit" type="number" bind:value={form.usageLimit} /></div>
				<div class="space-y-2"><Label for="perCustomer">Per Customer Limit</Label><Input id="perCustomer" type="number" bind:value={form.usageLimitPerCustomer} /></div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="startDate">Start Date</Label>
					<Input id="startDate" type="date" bind:value={form.startDate} />
				</div>
				<div class="space-y-2">
					<Label for="endDate">End Date</Label>
					<Input
						id="endDate"
						type="date"
						bind:value={form.endDate}
						aria-invalid={formErrors.endDate ? 'true' : undefined}
						aria-describedby={formErrors.endDate ? 'endDate-error' : undefined}
					/>
					{#if formErrors.endDate}
						<p id="endDate-error" class="text-sm text-destructive">{formErrors.endDate}</p>
					{/if}
				</div>
			</div>
			<div class="flex items-center justify-between"><Label>Active</Label><Switch bind:checked={form.isActive} /></div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingCoupon ? 'Update' : 'Create'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
