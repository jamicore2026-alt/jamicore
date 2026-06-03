<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent} from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
		import * as Dialog from '$lib/components/ui/dialog';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import FolderOpen from '@lucide/svelte/icons/folder-open';

	let { data } = $props();

	interface Category {
		id: string;
		nameEn: string;
		nameAr: string | null;
	}

	let showDialog = $state(false);
	let editingCategory = $state<Category | null>(null);
	let form = $state({ nameEn: '', nameAr: '' });
	let saving = $state(false);

	function openCreate() {
		editingCategory = null;
		form = { nameEn: '', nameAr: '' };
		showDialog = true;
	}

	function openEdit(cat: Category) {
		editingCategory = cat;
		form = { nameEn: cat.nameEn, nameAr: cat.nameAr || '' };
		showDialog = true;
	}

	async function handleSave() {
		if (!form.nameEn.trim()) {
			toast.error('Category name is required');
			return;
		}

		saving = true;
		try {
			if (editingCategory) {
				await apiFetch(`/merchant/categories/${editingCategory.id}`, {
					method: 'PATCH',
					body: JSON.stringify(form),
				});
				toast.success('Category updated');
			} else {
				await apiFetch('/merchant/categories', {
					method: 'POST',
					body: JSON.stringify(form),
				});
				toast.success('Category created');
			}
			showDialog = false;
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to save category');
		} finally {
			saving = false;
		}
	}

	async function deleteCategory(id: string) {
		if (!confirm('Delete this category? Products in this category will be unlinked.')) return;
		try {
			await apiFetch(`/merchant/categories/${id}`, { method: 'DELETE' });
			toast.success('Category deleted');
			invalidateAll();
		} catch {
			toast.error('Failed to delete category');
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Categories</h1>
			<p class="text-muted-foreground">Organize your products into categories</p>
		</div>
		<Button onclick={openCreate} class="gap-2">
			<Plus class="w-4 h-4" />
			Add Category
		</Button>
	</div>

	<Card>
		<CardContent class="p-0">
			{#if !data.categories || data.categories.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<FolderOpen class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No categories yet</p>
					<p class="text-sm mt-1">Create your first category to organize products.</p>
					<Button onclick={openCreate} class="mt-4 gap-2">
						<Plus class="w-4 h-4" />
						Add Category
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name (English)</Table.Head>
							<Table.Head>Name (Arabic)</Table.Head>
							<Table.Head class="text-center">Products</Table.Head>
							<Table.Head class="text-right w-24">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.categories as cat (cat.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{cat.nameEn}</Table.Cell>
								<Table.Cell class="text-muted-foreground" dir="rtl">{cat.nameAr || '—'}</Table.Cell>
								<Table.Cell class="text-center">{cat.products?.length ?? cat._count?.products ?? '—'}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => openEdit(cat)}
											class="p-1.5 rounded hover:bg-muted transition-colors"
											title="Edit"
										>
											<Pencil class="w-4 h-4 text-muted-foreground" />
										</button>
										<button
											onclick={() => deleteCategory(cat.id)}
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
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Create/Edit Dialog -->
<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingCategory ? 'Edit Category' : 'Create Category'}</Dialog.Title>
			<Dialog.Description>
				{editingCategory ? 'Update the category details below.' : 'Add a new category for your products.'}
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="nameEn">Name (English) *</Label>
				<Input id="nameEn" bind:value={form.nameEn} placeholder="e.g. Burgers" required />
			</div>
			<div class="space-y-2">
				<Label for="nameAr">Name (Arabic)</Label>
				<Input id="nameAr" bind:value={form.nameAr} placeholder="الاسم بالعربية" dir="rtl" />
			</div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
