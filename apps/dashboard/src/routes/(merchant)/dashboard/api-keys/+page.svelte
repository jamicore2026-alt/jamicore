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
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Key from '@lucide/svelte/icons/key';
	import Copy from '@lucide/svelte/icons/copy';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Label } from '$lib/components/ui/label';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter,
		DialogDescription,
	} from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';

	let { data } = $props();

	let deleting = $state<string | null>(null);
	let showCreate = $state(false);
	let showKey = $state(false);
	let createdKey = $state('');

	let form = $state({
		name: '',
		scopes: ['merchant'] as string[],
		expiresInDays: 30,
	});
	let saving = $state(false);

	const keys = $derived(data.keys?.items || []);
	const total = $derived(data.keys?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/api-keys?${params}`);
	}

	function toggleScope(scope: string) {
		if (form.scopes.includes(scope)) {
			form.scopes = form.scopes.filter((s) => s !== scope);
		} else {
			form.scopes = [...form.scopes, scope];
		}
	}

	function openCreate() {
		form = { name: '', scopes: ['merchant'], expiresInDays: 30 };
		showCreate = true;
	}

	function closeCreate() {
		showCreate = false;
	}

	async function createKey() {
		if (!form.name || form.scopes.length === 0) {
			toast.error('Name and at least one scope are required');
			return;
		}
		saving = true;
		try {
			const result = await apiFetch<{ apiKey: { rawKey: string } }>('/merchant/api-keys', {
				method: 'POST',
				body: JSON.stringify({
					name: form.name,
					scopes: form.scopes,
					expiresInDays: form.expiresInDays,
				}),
			});
			createdKey = result.apiKey.rawKey;
			showCreate = false;
			showKey = true;
			invalidateAll();
		} catch {
			toast.error('Failed to create API key');
		} finally {
			saving = false;
		}
	}

	async function copyKey() {
		try {
			await navigator.clipboard.writeText(createdKey);
			toast.success('Copied to clipboard');
		} catch {
			toast.error('Failed to copy');
		}
	}

	async function deleteKey(id: string) {
		if (!confirm('Are you sure you want to revoke this API key?')) return;
		deleting = id;
		try {
			await apiFetch(`/merchant/api-keys/${id}`, { method: 'DELETE' });
			toast.success('API key revoked');
			invalidateAll();
		} catch {
			toast.error('Failed to revoke key');
		} finally {
			deleting = null;
		}
	}

	function formatDate(d: string | null) {
		if (!d) return 'Never';
		return new Date(d).toLocaleDateString();
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">API Keys</h1>
			<p class="text-muted-foreground">Manage API keys for programmatic access</p>
		</div>
		<Button onclick={openCreate} class="gap-2">
			<Plus class="w-4 h-4" />
			New Key
		</Button>
	</div>

	<!-- Info Card -->
	<Card class="bg-muted/50">
		<CardContent class="p-4 text-sm text-muted-foreground">
			<p>
				API keys allow external applications to access your store data. Keep them secure — they
				grant the same permissions as your user account.
			</p>
		</CardContent>
	</Card>

	<!-- Keys Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} key{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if keys.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<p class="text-lg font-medium">No API keys</p>
					<p class="text-sm mt-1">Create an API key to integrate with external tools.</p>
					<Button onclick={openCreate} class="mt-4 gap-2">
						<Plus class="w-4 h-4" />
						New Key
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Prefix</Table.Head>
							<Table.Head>Scopes</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head>Last Used</Table.Head>
							<Table.Head>Expires</Table.Head>
							<Table.Head class="text-right w-20">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each keys as k (k.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Key class="w-4 h-4 text-muted-foreground" />
										<span class="font-medium">{k.name}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="font-mono text-sm text-muted-foreground">
									{k.keyPrefix}...
								</Table.Cell>
								<Table.Cell>
									<div class="flex gap-1 flex-wrap">
										{#each k.scopes as scope}
											<Badge variant="secondary" class="text-xs">{scope}</Badge>
										{/each}
									</div>
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if k.isActive}
										<Badge class="bg-success/15 text-success border-success/30">Active</Badge>
									{:else}
										<Badge variant="destructive">Revoked</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground text-sm">
									{formatDate(k.lastUsedAt)}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground text-sm">
									{formatDate(k.expiresAt)}
								</Table.Cell>
								<Table.Cell class="text-right">
									<button
										onclick={() => deleteKey(k.id)}
										disabled={deleting === k.id}
										class="p-1.5 rounded hover:bg-destructive/10 transition-colors"
										title="Revoke"
									>
										<Trash2 class="w-4 h-4 text-destructive" />
									</button>
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

<!-- Create Dialog -->
<Dialog open={showCreate} onOpenChange={(v) => { if (!v) closeCreate(); }}>
	<DialogContent class="max-w-lg">
		<DialogHeader>
			<DialogTitle>New API Key</DialogTitle>
			<DialogDescription>
				Create a key for programmatic access. The full key will be shown once.
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="name">Name <span class="text-destructive">*</span></Label>
				<Input id="name" bind:value={form.name} placeholder="Production API Key" />
			</div>

			<div class="space-y-2">
				<Label>Scopes <span class="text-destructive">*</span></Label>
				<div class="flex gap-4">
					<label class="flex items-center gap-2 cursor-pointer">
						<Checkbox checked={form.scopes.includes('merchant')} onCheckedChange={() => toggleScope('merchant')} />
						<span class="text-sm">Merchant</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<Checkbox checked={form.scopes.includes('public')} onCheckedChange={() => toggleScope('public')} />
						<span class="text-sm">Public</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<Checkbox checked={form.scopes.includes('webhook')} onCheckedChange={() => toggleScope('webhook')} />
						<span class="text-sm">Webhook</span>
					</label>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="expires">Expires in (days)</Label>
				<Input id="expires" type="number" bind:value={form.expiresInDays} min="1" max="365" />
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={closeCreate}>Cancel</Button>
			<Button onclick={createKey} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Show Key Dialog -->
<Dialog open={showKey} onOpenChange={(v) => { if (!v) showKey = false; }}>
	<DialogContent class="max-w-lg">
		<DialogHeader>
			<DialogTitle>API Key Created</DialogTitle>
			<DialogDescription>
				Copy this key now. You will not be able to see it again.
			</DialogDescription>
		</DialogHeader>

		<div class="py-4">
			<div class="flex gap-2">
				<Input value={createdKey} readonly class="font-mono text-sm" />
				<Button variant="outline" size="icon" onclick={copyKey}>
					<Copy class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<DialogFooter>
			<Button onclick={() => (showKey = false)}>Done</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
