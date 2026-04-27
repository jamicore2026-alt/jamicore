<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Globe from '@lucide/svelte/icons/globe';

	let { data } = $props();

	let showDialog = $state(false);
	let form = $state({ baseCurrency: '', targetCurrency: '', rate: '' });
	let submitting = $state(false);

	const rates = $derived(data.rates || []);
	const storeCurrency = $derived(data.storeCurrency || 'USD');

	async function addRate() {
		if (!form.baseCurrency || !form.targetCurrency || !form.rate) {
			toast.error('All fields are required');
			return;
		}
		submitting = true;
		try {
			await apiFetch('/merchant/currency', {
				method: 'POST',
				body: JSON.stringify(form),
			});
			toast.success('Rate added');
			showDialog = false;
			form = { baseCurrency: '', targetCurrency: '', rate: '' };
			invalidateAll();
		} catch {
			toast.error('Failed to add rate');
		} finally {
			submitting = false;
		}
	}

	async function deleteRate(id: string) {
		if (!confirm('Delete this rate?')) return;
		try {
			await apiFetch(`/merchant/currency/${id}`, { method: 'DELETE' });
			toast.success('Rate deleted');
			invalidateAll();
		} catch {
			toast.error('Failed to delete rate');
		}
	}

	const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AED', 'SAR', 'CAD', 'AUD'];
</script>

<div class="space-y-6 max-w-3xl">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Currency Settings</h1>
			<p class="text-muted-foreground">Manage exchange rates for multi-currency support.</p>
		</div>
		<Button onclick={() => showDialog = true}><Plus class="w-4 h-4 mr-1" />Add Rate</Button>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="text-sm">Store Currency</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex items-center gap-2">
				<Globe class="w-4 h-4 text-muted-foreground" />
				<span class="text-lg font-medium">{storeCurrency}</span>
				<Badge variant="outline">Default</Badge>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardContent class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Base</Table.Head>
						<Table.Head>Target</Table.Head>
						<Table.Head>Rate</Table.Head>
						<Table.Head>Source</Table.Head>
						<Table.Head class="w-[60px]"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rates as r (r.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{r.baseCurrency}</Table.Cell>
							<Table.Cell>{r.targetCurrency}</Table.Cell>
							<Table.Cell>{r.rate}</Table.Cell>
							<Table.Cell><Badge variant="outline">{r.source || 'manual'}</Badge></Table.Cell>
							<Table.Cell>
								<Button size="icon" variant="ghost" onclick={() => deleteRate(r.id)}><Trash2 class="w-3.5 h-3.5 text-destructive" /></Button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="5" class="text-center py-8 text-muted-foreground">
								<Globe class="w-8 h-8 mx-auto mb-2 opacity-50" />
								No exchange rates configured.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</CardContent>
	</Card>
</div>

<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Exchange Rate</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-2"><Label>Base Currency</Label><Input bind:value={form.baseCurrency} placeholder="USD" maxlength="3" /></div>
			<div class="space-y-2"><Label>Target Currency</Label><Input bind:value={form.targetCurrency} placeholder="EUR" maxlength="3" /></div>
			<div class="space-y-2"><Label>Rate</Label><Input bind:value={form.rate} placeholder="0.85" /></div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showDialog = false}>Cancel</Button>
			<Button onclick={addRate} disabled={submitting}>{submitting ? 'Adding...' : 'Add Rate'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
