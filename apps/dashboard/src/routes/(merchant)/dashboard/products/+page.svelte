<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	let searchValue = $state(data?.search || '');
	let deleting = $state<string | null>(null);

	const products = $derived(data.products?.items || data.products?.products || []);
	const total = $derived(data.products?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	function doSearch() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) params.set('search', searchValue);
		else params.delete('search');
		params.set('page', '1');
		goto(`/dashboard/products?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/products?${params}`);
	}

	async function togglePublish(product: any) {
		try {
			await apiFetch(`/merchant/products/${product.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ isPublished: !product.isPublished }),
			});
			toast.success(product.isPublished ? 'Product unpublished' : 'Product published');
			invalidateAll();
		} catch {
			toast.error('Failed to update product');
		}
	}

	async function deleteProduct(id: string) {
		if (!confirm('Are you sure you want to delete this product?')) return;
		deleting = id;
		try {
			await apiFetch(`/merchant/products/${id}`, { method: 'DELETE' });
			toast.success('Product deleted');
			invalidateAll();
		} catch {
			toast.error('Failed to delete product');
		} finally {
			deleting = null;
		}
	}

	function formatPrice(price: string | number) {
		return `$${Number(price).toFixed(2)}`;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Products</h1>
			<p class="text-muted-foreground">Manage your product catalog</p>
		</div>
		<Button href="/dashboard/products/new" class="gap-2">
			<Plus class="w-4 h-4" />
			Add Product
		</Button>
	</div>

	<!-- Search & Filters -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex gap-3">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						bind:value={searchValue}
						placeholder="Search products..."
						class="pl-10"
					/>
				</div>
				<Button type="submit" variant="secondary">Search</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Products Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">
				{total} product{total !== 1 ? 's' : ''} found
			</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if products.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<p class="text-lg font-medium">No products found</p>
					<p class="text-sm mt-1">Create your first product to get started.</p>
					<Button href="/dashboard/products/new" class="mt-4 gap-2">
						<Plus class="w-4 h-4" />
						Add Product
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-16">Image</Table.Head>
							<Table.Head>Name</Table.Head>
							<Table.Head>Category</Table.Head>
							<Table.Head class="text-right">Price</Table.Head>
							<Table.Head class="text-center">Stock</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-right w-32">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each products as product (product.id)}
							<Table.Row>
								<Table.Cell>
									{#if product.images}
										{@const imgSrc = typeof product.images === 'string' ? product.images.split(',')[0] : ''}
										{#if imgSrc}
											<img src={imgSrc} alt={product.titleEn} class="w-10 h-10 rounded object-cover" />
										{:else}
											<div class="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
										{/if}
									{:else}
										<div class="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<span class="font-medium">{product.titleEn}</span>
									{#if product.titleAr}
										<br /><span class="text-xs text-muted-foreground">{product.titleAr}</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{product.category?.nameEn || '—'}
								</Table.Cell>
								<Table.Cell class="text-right font-medium">
									{formatPrice(product.salePrice)}
									{#if product.discount && Number(product.discount) > 0}
										<Badge variant="secondary" class="ml-1 text-xs">
											{product.discountType === 'Percent' ? `${product.discount}%` : formatPrice(product.discount)} off
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">
									<span class={product.currentQuantity <= 0 ? 'text-destructive font-medium' : ''}>
										{product.currentQuantity ?? 0}
									</span>
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if product.isPublished}
										<Badge class="bg-success/15 text-success border-success/30">Published</Badge>
									{:else}
										<Badge variant="secondary">Draft</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => togglePublish(product)}
											class="p-1.5 rounded hover:bg-muted transition-colors"
											title={product.isPublished ? 'Unpublish' : 'Publish'}
										>
											{#if product.isPublished}
												<EyeOff class="w-4 h-4 text-muted-foreground" />
											{:else}
												<Eye class="w-4 h-4 text-muted-foreground" />
											{/if}
										</button>
										<a
											href="/dashboard/products/{product.id}"
											class="p-1.5 rounded hover:bg-muted transition-colors"
											title="Edit"
										>
											<Pencil class="w-4 h-4 text-muted-foreground" />
										</a>
										<button
											onclick={() => deleteProduct(product.id)}
											disabled={deleting === product.id}
											class="p-1.5 rounded hover:bg-destructive/10 transition-colors"
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

				<!-- Pagination -->
				{#if totalPages > 1}
					<Separator />
					<div class="flex items-center justify-between p-4">
						<p class="text-sm text-muted-foreground">
							Page {currentPage} of {totalPages}
						</p>
						<div class="flex gap-1">
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage <= 1}
								onclick={() => goToPage(currentPage - 1)}
							>
								<ChevronLeft class="w-4 h-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= totalPages}
								onclick={() => goToPage(currentPage + 1)}
							>
								<ChevronRight class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>
