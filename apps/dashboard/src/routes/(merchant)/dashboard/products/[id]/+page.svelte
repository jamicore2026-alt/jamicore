<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ImageUploader from '$lib/components/ui/image-uploader/ImageUploader.svelte';

	let { data } = $props();

	interface CategoryOption {
		id: string;
		nameEn: string;
	}

	let saving = $state(false);
		// svelte-ignore state_referenced_locally
	let { product } = data;

	let images = $state<string[]>(Array.isArray(product.images) ? product.images : []);

	let form = $state({
		titleEn: product.titleEn || '',
		titleAr: product.titleAr || '',
		descriptionEn: product.descriptionEn || '',
		descriptionAr: product.descriptionAr || '',
		salePrice: String(product.salePrice || ''),
		purchasePrice: String(product.purchasePrice || ''),
		categoryId: product.categoryId || '',
		currentQuantity: String(product.currentQuantity || 0),
		inventoryAlertThreshold: String(product.inventoryAlertThreshold || 0),
		barcode: product.barcode || '',
		tags: product.tags || '',
		discount: String(product.discount || '0'),
		discountType: product.discountType || 'Percent',
		isPublished: product.isPublished ?? true,
		sortOrder: String(product.sortOrder || 0),
		preparationTime: String(product.preparationTime || ''),
	});

	async function handleSave() {
		if (!form.titleEn || !form.salePrice || !form.categoryId) {
			toast.error('Please fill in required fields');
			return;
		}

		saving = true;
		try {
			const payload: Record<string, any> = {
				titleEn: form.titleEn,
				salePrice: form.salePrice,
				categoryId: form.categoryId,
				currentQuantity: Number(form.currentQuantity) || 0,
				inventoryAlertThreshold: Number(form.inventoryAlertThreshold) || 0,
				isPublished: form.isPublished,
				sortOrder: Number(form.sortOrder) || 0,
				discount: form.discount || '0',
				discountType: form.discountType,
			};

			if (form.titleAr) payload.titleAr = form.titleAr;
			if (form.descriptionEn) payload.descriptionEn = form.descriptionEn;
			if (form.descriptionAr) payload.descriptionAr = form.descriptionAr;
			if (form.purchasePrice) payload.purchasePrice = form.purchasePrice;
			if (form.barcode) payload.barcode = form.barcode;
			if (form.tags) payload.tags = String(form.tags).split(',').map((t: string) => t.trim()).filter(Boolean);
			if (form.preparationTime) payload.preparationTime = Number(form.preparationTime);
			if (images.length > 0) payload.images = images;

			await apiFetch(`/merchant/products/${product.id}`, {
				method: 'PATCH',
				body: JSON.stringify(payload),
			});

			toast.success('Product updated');
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to update product');
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
		try {
			await apiFetch(`/merchant/products/${product.id}`, { method: 'DELETE' });
			toast.success('Product deleted');
			goto('/dashboard/products');
		} catch {
			toast.error('Failed to delete product');
		}
	}
</script>

<div class="space-y-6 max-w-4xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" href="/dashboard/products" class="gap-2">
				<ArrowLeft class="w-4 h-4" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Edit Product</h1>
				<p class="text-muted-foreground">{product.titleEn}</p>
			</div>
		</div>
		<Button variant="destructive" size="sm" onclick={handleDelete} class="gap-2">
			<Trash2 class="w-4 h-4" />
			Delete
		</Button>
	</div>

	<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-6">
		<!-- Basic Info -->
		<Card>
			<CardHeader>
				<CardTitle>Basic Information</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="titleEn">Product Name (English) *</Label>
						<Input id="titleEn" bind:value={form.titleEn} required />
					</div>
					<div class="space-y-2">
						<Label for="titleAr">Product Name (Arabic)</Label>
						<Input id="titleAr" bind:value={form.titleAr} dir="rtl" />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="descriptionEn">Description (English)</Label>
					<Textarea id="descriptionEn" bind:value={form.descriptionEn} rows={3} />
				</div>

				<div class="space-y-2">
					<Label for="descriptionAr">Description (Arabic)</Label>
					<Textarea id="descriptionAr" bind:value={form.descriptionAr} dir="rtl" rows={3} />
				</div>

				<div class="space-y-2">
					<Label for="category">Category *</Label>
					<Select.Root type="single" value={form.categoryId} onValueChange={(v) => form.categoryId = v}>
						<Select.Trigger class="w-full">
							{data.categories?.find((c: CategoryOption) => c.id === form.categoryId)?.nameEn || 'Select category'}
						</Select.Trigger>
						<Select.Content>
							{#each data.categories as cat}
								<Select.Item value={cat.id}>{cat.nameEn}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</CardContent>
		</Card>

		<!-- Pricing & Inventory -->
		<Card>
			<CardHeader>
				<CardTitle>Pricing & Inventory</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="salePrice">Sale Price *</Label>
						<Input id="salePrice" type="number" step="0.01" min="0" bind:value={form.salePrice} required />
					</div>
					<div class="space-y-2">
						<Label for="purchasePrice">Cost Price</Label>
						<Input id="purchasePrice" type="number" step="0.01" min="0" bind:value={form.purchasePrice} />
					</div>
					<div class="space-y-2">
						<Label for="quantity">Stock Quantity</Label>
						<Input id="quantity" type="number" min="0" bind:value={form.currentQuantity} />
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="discount">Discount</Label>
						<Input id="discount" type="number" step="0.01" min="0" bind:value={form.discount} />
					</div>
					<div class="space-y-2">
						<Label for="discountType">Discount Type</Label>
						<Select.Root type="single" value={form.discountType} onValueChange={(v) => form.discountType = v}>
							<Select.Trigger class="w-full">
								{form.discountType}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="Percent">Percent (%)</Select.Item>
								<Select.Item value="Fixed">Fixed Amount</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="barcode">Barcode / SKU</Label>
						<Input id="barcode" bind:value={form.barcode} />
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="alertThreshold">Alert Threshold</Label>
						<Input id="alertThreshold" type="number" min="0" bind:value={form.inventoryAlertThreshold} />
						<p class="text-xs text-muted-foreground">Notify when stock falls below this number.</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Additional -->
		<Card>
			<CardHeader>
				<CardTitle>Additional Settings</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="tags">Tags</Label>
						<Input id="tags" bind:value={form.tags} />
					</div>
					<div class="space-y-2">
						<Label for="sortOrder">Sort Order</Label>
						<Input id="sortOrder" type="number" bind:value={form.sortOrder} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="prepTime">Preparation Time (minutes)</Label>
					<Input id="prepTime" type="number" min="0" bind:value={form.preparationTime} />
				</div>

				<Separator />

				<div class="flex items-center justify-between">
					<div>
						<Label for="published">Published</Label>
						<p class="text-sm text-muted-foreground">Product will be visible to customers</p>
					</div>
					<Switch id="published" bind:checked={form.isPublished} />
				</div>
			</CardContent>
		</Card>

		<!-- Images -->
		<Card>
			<CardHeader>
				<CardTitle>Product Images</CardTitle>
				<CardDescription>Upload up to 10 images. Drag to reorder. First image is the cover.</CardDescription>
			</CardHeader>
			<CardContent>
				<ImageUploader bind:images />
			</CardContent>
		</Card>

		<!-- Actions -->
		<div class="flex justify-end gap-3">
			<Button variant="outline" href="/dashboard/products">Cancel</Button>
			<Button type="submit" disabled={saving} class="gap-2">
				<Save class="w-4 h-4" />
				{saving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	</form>
</div>
