<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Search from '@lucide/svelte/icons/search';
	import Package from '@lucide/svelte/icons/package';
	import Save from '@lucide/svelte/icons/save';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	let searchValue = $state(data?.search || '');
	let editingQty = $state<Record<string, number>>({});
	let saving = $state<string | null>(null);

	const products = $derived(data.products?.products || data.products?.items || []);
	const total = $derived(data.products?.total || 0);
	const currentPage = $derived(Number(data.products?.pagination?.page || data.products?.page || '1'));
	const totalPages = $derived(Math.ceil(total / 20) || 1);

	function stockStatus(qty: number) {
		if (qty <= 0) return { label: 'Out of Stock', variant: 'destructive' as const };
		if (qty < 30) return { label: 'Low Stock', variant: 'secondary' as const };
		return { label: 'In Stock', variant: 'default' as const };
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', String(p));
		window.location.href = `/dashboard/inventory?${params}`;
	}

	function doSearch() {
		const params = new URLSearchParams();
		if (searchValue) params.set('search', searchValue);
		params.set('page', '1');
		window.location.href = `/dashboard/inventory?${params}`;
	}

	async function updateStock(productId: string) {
		const qty = editingQty[productId];
		if (qty === undefined || qty < 0) {
			toast.error('Invalid quantity');
			return;
		}
		saving = productId;
		try {
			await apiFetch(`/merchant/products/${productId}`, {
				method: 'PATCH',
				body: JSON.stringify({ currentQuantity: qty }),
			});
			toast.success('Stock updated');
			invalidateAll();
		} catch {
			toast.error('Failed to update stock');
		} finally {
			saving = null;
			delete editingQty[productId];
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Inventory</h1>
			<p class="text-muted-foreground">Manage product stock levels.</p>
		</div>
		<div class="flex items-center gap-2 w-full sm:w-auto">
			<Input bind:value={searchValue} placeholder="Search products..." class="max-w-xs" onkeydown={(e) => e.key === 'Enter' && doSearch()} />
			<Button variant="outline" onclick={doSearch}><Search class="w-4 h-4" /></Button>
		</div>
	</div>

	<Card>
		<CardContent class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[40%]">Product</Table.Head>
						<Table.Head>Category</Table.Head>
						<Table.Head class="w-[120px]">Stock</Table.Head>
						<Table.Head class="w-[100px]">Status</Table.Head>
						<Table.Head class="w-[140px]">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each products as p (p.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{p.titleEn}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{p.category?.nameEn || '-'}</Table.Cell>
							<Table.Cell>
								<Input
									type="number"
									min="0"
									class="w-24"
									value={editingQty[p.id] ?? p.currentQuantity}
									oninput={(e) => editingQty = { ...editingQty, [p.id]: Number((e.target as HTMLInputElement).value) }}
								/>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={stockStatus(p.currentQuantity).variant}>{stockStatus(p.currentQuantity).label}</Badge>
							</Table.Cell>
							<Table.Cell>
								<Button size="sm" onclick={() => updateStock(p.id)} disabled={saving === p.id}>
									<Save class="w-3.5 h-3.5 mr-1" />
									{saving === p.id ? 'Saving...' : 'Save'}
								</Button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="5" class="text-center py-8 text-muted-foreground">
								<Package class="w-8 h-8 mx-auto mb-2 opacity-50" />
								No products found.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</CardContent>
	</Card>

	{#if totalPages > 1}
		<div class="flex items-center justify-center gap-2">
			<Button variant="outline" size="sm" onclick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
				<ChevronLeft class="w-4 h-4" />
			</Button>
			<span class="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
			<Button variant="outline" size="sm" onclick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
				<ChevronRight class="w-4 h-4" />
			</Button>
		</div>
	{/if}
</div>