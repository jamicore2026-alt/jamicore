<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Receipt from '@lucide/svelte/icons/receipt';

	let { data } = $props();

	let showDialog = $state(false);
	let editingRate = $state<any>(null);
	let saving = $state(false);

	let form = $state({ name: '', rate: '', country: '', state: '', isCompound: false, priority: '0', isActive: true });

	function openCreate() {
		editingRate = null;
		form = { name: '', rate: '', country: '', state: '', isCompound: false, priority: '0', isActive: true };
		showDialog = true;
	}

	function openEdit(rate: any) {
		editingRate = rate;
		form = {
			name: rate.name, rate: String(rate.rate), country: rate.country || '',
			state: rate.state || '', isCompound: rate.isCompound ?? false,
			priority: String(rate.priority || 0), isActive: rate.isActive ?? true,
		};
		showDialog = true;
	}

	async function handleSave() {
		if (!form.name.trim() || !form.rate) { toast.error('Name and rate are required'); return; }
		saving = true;
		try {
			const payload = { name: form.name, rate: form.rate, country: form.country, state: form.state, isCompound: form.isCompound, priority: Number(form.priority), isActive: form.isActive };
			if (editingRate) {
				await apiFetch(`/merchant/tax/${editingRate.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
				toast.success('Tax rate updated');
			} else {
				await apiFetch('/merchant/tax', { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Tax rate created');
			}
			showDialog = false;
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to save');
		} finally { saving = false; }
	}

	async function deleteRate(id: string) {
		if (!confirm('Delete this tax rate?')) return;
		try { await apiFetch(`/merchant/tax/${id}`, { method: 'DELETE' }); toast.success('Deleted'); invalidateAll(); }
		catch { toast.error('Failed to delete'); }
	}
</script>

<div class="space-y-6 max-w-3xl">
	<Card>
		<CardHeader class="flex flex-row items-center justify-between">
			<div>
				<CardTitle class="flex items-center gap-2"><Receipt class="w-5 h-5" />Tax Rates</CardTitle>
				<CardDescription>Configure tax rates by region</CardDescription>
			</div>
			<Button onclick={openCreate} size="sm" class="gap-2"><Plus class="w-4 h-4" />Add Rate</Button>
		</CardHeader>
		<CardContent class="p-0">
			{#if !data.rates || data.rates.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>No tax rates configured</p>
					<Button onclick={openCreate} class="mt-3 gap-2" size="sm"><Plus class="w-4 h-4" />Add Rate</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head class="text-right">Rate (%)</Table.Head>
							<Table.Head>Country</Table.Head>
							<Table.Head>State</Table.Head>
							<Table.Head class="text-center">Active</Table.Head>
							<Table.Head class="text-right w-24">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.rates as rate (rate.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{rate.name}</Table.Cell>
								<Table.Cell class="text-right">{rate.rate}%</Table.Cell>
								<Table.Cell class="text-muted-foreground">{rate.country || 'All'}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{rate.state || 'All'}</Table.Cell>
								<Table.Cell class="text-center">
									{#if rate.isActive}<span class="text-success">●</span>{:else}<span class="text-muted-foreground">●</span>{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										<button onclick={() => openEdit(rate)} class="p-1.5 rounded hover:bg-muted"><Pencil class="w-4 h-4 text-muted-foreground" /></button>
										<button onclick={() => deleteRate(rate.id)} class="p-1.5 rounded hover:bg-destructive/10"><Trash2 class="w-4 h-4 text-destructive" /></button>
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
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header><Dialog.Title>{editingRate ? 'Edit Tax Rate' : 'Create Tax Rate'}</Dialog.Title></Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2"><Label for="rateName">Name *</Label><Input id="rateName" bind:value={form.name} placeholder="e.g. VAT" required /></div>
			<div class="space-y-2"><Label for="rateVal">Rate (%) *</Label><Input id="rateVal" type="number" step="0.01" bind:value={form.rate} placeholder="10" required /></div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2"><Label for="taxCountry">Country</Label><Input id="taxCountry" bind:value={form.country} placeholder="US" /></div>
				<div class="space-y-2"><Label for="taxState">State</Label><Input id="taxState" bind:value={form.state} placeholder="CA" /></div>
			</div>
			<div class="flex items-center justify-between"><Label>Compound Tax</Label><Switch bind:checked={form.isCompound} /></div>
			<div class="flex items-center justify-between"><Label>Active</Label><Switch bind:checked={form.isActive} /></div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
