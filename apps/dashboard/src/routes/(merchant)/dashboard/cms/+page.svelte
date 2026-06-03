<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
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
	import Globe from '@lucide/svelte/icons/globe';
	import FileText from '@lucide/svelte/icons/file-text';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter,
	} from '$lib/components/ui/dialog';

	let { data } = $props();

	interface CmsPage {
		id: string;
		slug: string;
		title: string;
		content: string;
		metaTitle: string | null;
		metaDescription: string | null;
		isPublished: boolean;
	}

		// svelte-ignore state_referenced_locally
	let { search = '' } = data;
	let searchValue = $state(search);
	let deleting = $state<string | null>(null);
	let showDialog = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state({
		slug: '',
		title: '',
		content: '',
		metaTitle: '',
		metaDescription: '',
		isPublished: false,
	});
	let saving = $state(false);

	const pages = $derived(data.pages?.items || []);
	const total = $derived(data.pages?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	function doSearch() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) params.set('search', searchValue);
		else params.delete('search');
		params.set('page', '1');
		goto(`/dashboard/cms?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/cms?${params}`);
	}

	function openCreate() {
		editingId = null;
		form = { slug: '', title: '', content: '', metaTitle: '', metaDescription: '', isPublished: false };
		showDialog = true;
	}

	function openEdit(p: CmsPage) {
		editingId = p.id;
		form = {
			slug: p.slug,
			title: p.title,
			content: p.content,
			metaTitle: p.metaTitle || '',
			metaDescription: p.metaDescription || '',
			isPublished: p.isPublished,
		};
		showDialog = true;
	}

	function closeDialog() {
		showDialog = false;
		editingId = null;
	}

	async function savePage() {
		if (!form.slug || !form.title || !form.content) {
			toast.error('Slug, title, and content are required');
			return;
		}
		saving = true;
		try {
			if (editingId) {
				await apiFetch(`/merchant/cms/${editingId}`, {
					method: 'PATCH',
					body: JSON.stringify(form),
				});
				toast.success('Page updated');
			} else {
				await apiFetch('/merchant/cms', {
					method: 'POST',
					body: JSON.stringify(form),
				});
				toast.success('Page created');
			}
			closeDialog();
			invalidateAll();
		} catch {
			toast.error('Failed to save page');
		} finally {
			saving = false;
		}
	}

	async function togglePublish(p: CmsPage) {
		try {
			await apiFetch(`/merchant/cms/${p.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ isPublished: !p.isPublished }),
			});
			toast.success(p.isPublished ? 'Page unpublished' : 'Page published');
			invalidateAll();
		} catch {
			toast.error('Failed to update page');
		}
	}

	async function deletePage(id: string) {
		if (!confirm('Are you sure you want to delete this page?')) return;
		deleting = id;
		try {
			await apiFetch(`/merchant/cms/${id}`, { method: 'DELETE' });
			toast.success('Page deleted');
			invalidateAll();
		} catch {
			toast.error('Failed to delete page');
		} finally {
			deleting = null;
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">CMS Pages</h1>
			<p class="text-muted-foreground">Manage custom pages for your storefront</p>
		</div>
		<Button onclick={openCreate} class="gap-2">
			<Plus class="w-4 h-4" />
			New Page
		</Button>
	</div>

	<!-- Search -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex gap-3">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input bind:value={searchValue} placeholder="Search pages..." class="pl-10" />
				</div>
				<Button type="submit" variant="secondary">Search</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Pages Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} page{total !== 1 ? 's' : ''} found</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if pages.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<p class="text-lg font-medium">No pages found</p>
					<p class="text-sm mt-1">Create your first CMS page to get started.</p>
					<Button onclick={openCreate} class="mt-4 gap-2">
						<Plus class="w-4 h-4" />
						New Page
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Title</Table.Head>
							<Table.Head>Slug</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-right w-40">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each pages as p (p.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<FileText class="w-4 h-4 text-muted-foreground" />
										<span class="font-medium">{p.title}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									<span class="font-mono text-sm">/{p.slug}</span>
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if p.isPublished}
										<Badge class="bg-success/15 text-success border-success/30">Published</Badge>
									{:else}
										<Badge variant="secondary">Draft</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										<a
											href={`/pages/${p.slug}`}
											target="_blank"
											class="p-1.5 rounded hover:bg-muted transition-colors"
											title="View on storefront"
										>
											<Globe class="w-4 h-4 text-muted-foreground" />
										</a>
										<button
											onclick={() => togglePublish(p)}
											class="p-1.5 rounded hover:bg-muted transition-colors"
											title={p.isPublished ? 'Unpublish' : 'Publish'}
										>
											{#if p.isPublished}
												<EyeOff class="w-4 h-4 text-muted-foreground" />
											{:else}
												<Eye class="w-4 h-4 text-muted-foreground" />
											{/if}
										</button>
										<button
											onclick={() => openEdit(p)}
											class="p-1.5 rounded hover:bg-muted transition-colors"
											title="Edit"
										>
											<Pencil class="w-4 h-4 text-muted-foreground" />
										</button>
										<button
											onclick={() => deletePage(p.id)}
											disabled={deleting === p.id}
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

				{#if totalPages > 1}
					<div class="flex items-center justify-between p-4 border-t">
						<Button variant="outline" size="sm" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
							<ChevronLeft class="w-4 h-4" />
						</Button>
						<span class="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
						<Button variant="outline" size="sm" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
							<ChevronRight class="w-4 h-4" />
						</Button>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Create/Edit Dialog -->
<Dialog open={showDialog} onOpenChange={(v) => { if (!v) closeDialog(); }}>
	<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{editingId ? 'Edit Page' : 'New Page'}</DialogTitle>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="slug">Slug <span class="text-destructive">*</span></Label>
					<Input id="slug" bind:value={form.slug} placeholder="about-us" disabled={!!editingId} />
					<p class="text-xs text-muted-foreground">Lowercase with hyphens only. Cannot be changed after creation.</p>
				</div>
				<div class="space-y-2">
					<Label for="title">Title <span class="text-destructive">*</span></Label>
					<Input id="title" bind:value={form.title} placeholder="About Us" />
				</div>
			</div>

			<div class="space-y-2">
				<Label for="content">Content <span class="text-destructive">*</span></Label>
				<Textarea id="content" bind:value={form.content} rows={8} placeholder="Page content..." />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="metaTitle">Meta Title</Label>
					<Input id="metaTitle" bind:value={form.metaTitle} placeholder="SEO title" />
				</div>
				<div class="space-y-2">
					<Label for="metaDescription">Meta Description</Label>
					<Input id="metaDescription" bind:value={form.metaDescription} placeholder="SEO description" />
				</div>
			</div>

			<div class="flex items-center gap-3 pt-2">
				<Switch id="published" bind:checked={form.isPublished} />
				<Label for="published" class="cursor-pointer">Published</Label>
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={closeDialog}>Cancel</Button>
			<Button onclick={savePage} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>