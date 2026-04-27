<script lang="ts">
	import { goto } from '$app/navigation';
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
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';

	let { data } = $props();

	let saving = $state(false);
	let form = $state({
		titleEn: '',
		titleAr: '',
		descriptionEn: '',
		descriptionAr: '',
		salePrice: '',
		purchasePrice: '',
		categoryId: '',
		currentQuantity: '0',
		barcode: '',
		tags: '',
		discount: '0',
		discountType: 'Percent',
		isPublished: true,
		sortOrder: '0',
		preparationTime: '',
	});

	async function handleSubmit() {
		if (!form.titleEn || !form.salePrice || !form.categoryId) {
			toast.error('Please fill in required fields: Title, Price, and Category');
			return;
		}

		saving = true;
		try {
			const payload: Record<string, any> = {
				titleEn: form.titleEn,
				salePrice: String(form.salePrice),
				categoryId: form.categoryId,
				currentQuantity: Number(form.currentQuantity) || 0,
				isPublished: form.isPublished,
				sortOrder: Number(form.sortOrder) || 0,
				discount: String(form.discount || '0'),
				discountType: form.discountType,
			};

			if (form.titleAr) payload.titleAr = form.titleAr;
			if (form.descriptionEn) payload.descriptionEn = form.descriptionEn;
			if (form.descriptionAr) payload.descriptionAr = form.descriptionAr;
			if (form.purchasePrice) payload.purchasePrice = String(form.purchasePrice);
			if (form.barcode) payload.barcode = form.barcode;
			if (form.tags) payload.tags = form.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
			if (form.preparationTime) payload.preparationTime = Number(form.preparationTime);

			const result = await apiFetch<{ id: string }>('/merchant/products', {
				method: 'POST',
				body: JSON.stringify(payload),
			});

			toast.success('Product created successfully');
			goto(`/dashboard/products/${result.id || ''}`);
		} catch (err: any) {
			toast.error(err?.message || err?.error || 'Failed to create product');
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6 max-w-4xl">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="sm" href="/dashboard/products" class="gap-2">
			<ArrowLeft class="w-4 h-4" />
			Back
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Create Product</h1>
			<p class="text-muted-foreground">Add a new product to your catalog</p>
		</div>
	</div>

	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
		<!-- Basic Info -->
		<Card>
			<CardHeader>
				<CardTitle>Basic Information</CardTitle>
				<CardDescription>Product name, description, and category</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="titleEn">Product Name (English) *</Label>
						<Input id="titleEn" bind:value={form.titleEn} placeholder="e.g. Classic Burger" required />
					</div>
					<div class="space-y-2">
						<Label for="titleAr">Product Name (Arabic)</Label>
						<Input id="titleAr" bind:value={form.titleAr} placeholder="الاسم بالعربية" dir="rtl" />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="descriptionEn">Description (English)</Label>
					<Textarea id="descriptionEn" bind:value={form.descriptionEn} placeholder="Describe your product..." rows={3} />
				</div>

				<div class="space-y-2">
					<Label for="descriptionAr">Description (Arabic)</Label>
					<Textarea id="descriptionAr" bind:value={form.descriptionAr} placeholder="وصف المنتج..." dir="rtl" rows={3} />
				</div>

				<div class="space-y-2">
					<Label for="category">Category *</Label>
					<Select.Root type="single" onValueChange={(v) => form.categoryId = v}>
						<Select.Trigger class="w-full">
							{#snippet children()}
								{data.categories?.find((c: any) => c.id === form.categoryId)?.nameEn || 'Select a category'}
							{/snippet}
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
				<CardDescription>Set your product price, cost, and stock level</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="salePrice">Sale Price *</Label>
						<Input id="salePrice" type="number" step="0.01" min="0" bind:value={form.salePrice} placeholder="0.00" required />
					</div>
					<div class="space-y-2">
						<Label for="purchasePrice">Cost Price</Label>
						<Input id="purchasePrice" type="number" step="0.01" min="0" bind:value={form.purchasePrice} placeholder="0.00" />
					</div>
					<div class="space-y-2">
						<Label for="quantity">Stock Quantity</Label>
						<Input id="quantity" type="number" min="0" bind:value={form.currentQuantity} placeholder="0" />
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="discount">Discount</Label>
						<Input id="discount" type="number" step="0.01" min="0" bind:value={form.discount} placeholder="0" />
					</div>
					<div class="space-y-2">
						<Label for="discountType">Discount Type</Label>
						<Select.Root type="single" value={form.discountType} onValueChange={(v) => form.discountType = v}>
							<Select.Trigger class="w-full">
								{#snippet children()}
									{form.discountType}
								{/snippet}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="Percent">Percent (%)</Select.Item>
								<Select.Item value="Fixed">Fixed Amount</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="barcode">Barcode / SKU</Label>
						<Input id="barcode" bind:value={form.barcode} placeholder="e.g. SKU-12345" />
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
						<Input id="tags" bind:value={form.tags} placeholder="tag1, tag2, tag3" />
					</div>
					<div class="space-y-2">
						<Label for="sortOrder">Sort Order</Label>
						<Input id="sortOrder" type="number" bind:value={form.sortOrder} placeholder="0" />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="prepTime">Preparation Time (minutes)</Label>
					<Input id="prepTime" type="number" min="0" bind:value={form.preparationTime} placeholder="e.g. 15" />
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

		<!-- Actions -->
		<div class="flex justify-end gap-3">
			<Button variant="outline" href="/dashboard/products">Cancel</Button>
			<Button type="submit" disabled={saving} class="gap-2">
				<Save class="w-4 h-4" />
				{saving ? 'Creating...' : 'Create Product'}
			</Button>
		</div>
	</form>
</div>
