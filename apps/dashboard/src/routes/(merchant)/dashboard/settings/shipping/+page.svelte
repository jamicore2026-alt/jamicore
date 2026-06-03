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
	import { errorMessage } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Truck from '@lucide/svelte/icons/truck';

	let { data } = $props();

	interface ShippingRate {
		name: string;
		price: string | number;
		minWeight: string | number | null;
		maxWeight: string | number | null;
		freeAbove: string | number | null;
	}

	interface ShippingZone {
		id: string;
		name: string;
		countries: string | null;
		states: string | null;
		rates: ShippingRate[] | null;
		isActive: boolean;
	}

	let showDialog = $state(false);
	let editingZone = $state<ShippingZone | null>(null);
	let saving = $state(false);
	// UI-008: per-field validation state — replaces toast.error for client-side
	// validation. Server/network errors still surface as toast.
	let formErrors = $state<Record<string, string>>({});

	let form = $state({
		name: '',
		countries: '',
		states: '',
		rateName: '',
		ratePrice: '',
		minWeight: '',
		maxWeight: '',
		freeAbove: '',
		isActive: true,
	});

	function resetForm() {
		form = { name: '', countries: '', states: '', rateName: 'Standard', ratePrice: '0', minWeight: '', maxWeight: '', freeAbove: '', isActive: true };
		formErrors = {};
	}

	function openCreate() {
		editingZone = null;
		resetForm();
		showDialog = true;
	}

	function openEdit(zone: ShippingZone) {
		editingZone = zone;
		form = {
			name: zone.name,
			countries: zone.countries || '',
			states: zone.states || '',
			rateName: zone.rates?.[0]?.name || 'Standard',
			ratePrice: String(zone.rates?.[0]?.price || '0'),
			minWeight: String(zone.rates?.[0]?.minWeight || ''),
			maxWeight: String(zone.rates?.[0]?.maxWeight || ''),
			freeAbove: String(zone.rates?.[0]?.freeAbove || ''),
			isActive: zone.isActive ?? true,
		};
		formErrors = {};
		showDialog = true;
	}

	function validateForm(): boolean {
		const errors: Record<string, string> = {};
		if (!form.name.trim()) errors.name = 'Zone name is required';
		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function handleSave() {
		// UI-008: validate locally and show inline field errors. Only fall back
		// to toast.error for actual network/server errors.
		if (!validateForm()) return;
		saving = true;
		try {
			if (editingZone) {
				await apiFetch(`/merchant/shipping/zones/${editingZone.id}`, {
					method: 'PATCH',
					body: JSON.stringify({ name: form.name, countries: form.countries, states: form.states, isActive: form.isActive }),
				});
				toast.success('Zone updated');
			} else {
				await apiFetch('/merchant/shipping/zones', {
					method: 'POST',
					body: JSON.stringify({ name: form.name, countries: form.countries, states: form.states, isActive: form.isActive }),
				});
				toast.success('Zone created');
			}
			showDialog = false;
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to save zone');
		} finally {
			saving = false;
		}
	}

	async function deleteZone(id: string) {
		if (!confirm('Delete this shipping zone?')) return;
		try {
			await apiFetch(`/merchant/shipping/zones/${id}`, { method: 'DELETE' });
			toast.success('Zone deleted');
			invalidateAll();
		} catch { toast.error('Failed to delete zone'); }
	}
</script>

<div class="space-y-6 max-w-3xl">
	<Card>
		<CardHeader class="flex flex-row items-center justify-between">
			<div>
				<CardTitle class="flex items-center gap-2">
					<Truck class="w-5 h-5" />
					Shipping Zones
				</CardTitle>
				<CardDescription>Define regions and shipping rates</CardDescription>
			</div>
			<Button onclick={openCreate} size="sm" class="gap-2">
				<Plus class="w-4 h-4" />
				Add Zone
			</Button>
		</CardHeader>
		<CardContent class="p-0">
			{#if !data.zones || data.zones.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>No shipping zones yet</p>
					<Button onclick={openCreate} class="mt-3 gap-2" size="sm">
						<Plus class="w-4 h-4" />
						Add Zone
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Zone Name</Table.Head>
							<Table.Head>Countries</Table.Head>
							<Table.Head class="text-center">Rates</Table.Head>
							<Table.Head class="text-center">Active</Table.Head>
							<Table.Head class="text-right w-24">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.zones as zone (zone.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{zone.name}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{zone.countries || 'All'}</Table.Cell>
								<Table.Cell class="text-center">{zone.rates?.length || 0}</Table.Cell>
								<Table.Cell class="text-center">
									{#if zone.isActive}
										<span class="text-success">●</span>
									{:else}
										<span class="text-muted-foreground">●</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => openEdit(zone)}
											aria-label={`Edit shipping zone ${zone.name}`}
											class="p-1.5 rounded hover:bg-muted"
											title="Edit"
										>
											<Pencil class="w-4 h-4 text-muted-foreground" />
										</button>
										<button
											onclick={() => deleteZone(zone.id)}
											aria-label={`Delete shipping zone ${zone.name}`}
											class="p-1.5 rounded hover:bg-destructive/10"
											title="Delete"
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
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingZone ? 'Edit Zone' : 'Create Zone'}</Dialog.Title>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="zoneName">Zone Name *</Label>
				<Input
					id="zoneName"
					bind:value={form.name}
					placeholder="e.g. Domestic"
					aria-invalid={formErrors.name ? 'true' : undefined}
					aria-describedby={formErrors.name ? 'zoneName-error' : undefined}
				/>
				{#if formErrors.name}
					<p id="zoneName-error" class="text-sm text-destructive">{formErrors.name}</p>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="countries">Countries</Label>
				<Input id="countries" bind:value={form.countries} placeholder="US, CA (comma-separated)" />
			</div>
			<div class="space-y-2">
				<Label for="states">States / Regions</Label>
				<Input id="states" bind:value={form.states} placeholder="CA, NY (comma-separated)" />
			</div>
			<div class="flex items-center justify-between">
				<Label for="zoneActive">Active</Label>
				<Switch id="zoneActive" bind:checked={form.isActive} />
			</div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
