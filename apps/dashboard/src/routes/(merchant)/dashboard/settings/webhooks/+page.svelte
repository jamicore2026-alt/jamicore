<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Webhook from '@lucide/svelte/icons/webhook';
	import Copy from '@lucide/svelte/icons/copy';

	let { data } = $props();

	let showDialog = $state(false);
	let form = $state({ url: '', events: ['order.created'], secret: '' });
	let submitting = $state(false);

	const webhooks = $derived(data.webhooks || []);
	const eventOptions = ['order.created', 'order.paid', 'order.cancelled', 'product.created', 'product.updated', 'product.deleted'];

	async function createWebhook() {
		if (!form.url.trim()) { toast.error('URL is required'); return; }
		if (form.events.length === 0) { toast.error('Select at least one event'); return; }
		submitting = true;
		try {
			await apiFetch('/merchant/webhooks', {
				method: 'POST',
				body: JSON.stringify(form),
			});
			toast.success('Webhook created');
			showDialog = false;
			form = { url: '', events: ['order.created'], secret: '' };
			invalidateAll();
		} catch {
			toast.error('Failed to create webhook');
		} finally {
			submitting = false;
		}
	}

	async function toggleActive(wh: any) {
		try {
			await apiFetch(`/merchant/webhooks/${wh.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ isActive: !wh.isActive }),
			});
			toast.success('Webhook updated');
			invalidateAll();
		} catch {
			toast.error('Failed to update webhook');
		}
	}

	async function deleteWebhook(id: string) {
		if (!confirm('Delete this webhook?')) return;
		try {
			await apiFetch(`/merchant/webhooks/${id}`, { method: 'DELETE' });
			toast.success('Webhook deleted');
			invalidateAll();
		} catch {
			toast.error('Failed to delete webhook');
		}
	}

	function toggleEvent(event: string) {
		if (form.events.includes(event)) {
			form.events = form.events.filter((e) => e !== event);
		} else {
			form.events = [...form.events, event];
		}
	}

	function copySecret(s: string) {
		navigator.clipboard.writeText(s);
		toast.success('Secret copied');
	}

	function formatDate(d: string | null) {
		if (!d) return 'Never';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="space-y-6 max-w-4xl">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Webhooks</h1>
			<p class="text-muted-foreground">Configure event-driven HTTP callbacks.</p>
		</div>
		<Button onclick={() => showDialog = true}><Plus class="w-4 h-4 mr-1" />Add Webhook</Button>
	</div>

	<Card>
		<CardContent class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>URL</Table.Head>
						<Table.Head>Events</Table.Head>
						<Table.Head>Active</Table.Head>
						<Table.Head>Last Delivered</Table.Head>
						<Table.Head>Failures</Table.Head>
						<Table.Head class="w-[80px]"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each webhooks as wh (wh.id)}
						<Table.Row>
							<Table.Cell class="font-mono text-xs max-w-[200px] truncate">{wh.url}</Table.Cell>
							<Table.Cell><span class="text-xs">{wh.events?.join(', ')}</span></Table.Cell>
							<Table.Cell><Switch checked={wh.isActive} onCheckedChange={() => toggleActive(wh)} /></Table.Cell>
							<Table.Cell class="text-xs text-muted-foreground">{formatDate(wh.lastDeliveredAt)}</Table.Cell>
							<Table.Cell>
								{#if (wh.failureCount || 0) > 0}
									<Badge variant="destructive">{wh.failureCount}</Badge>
								{:else}
									<span class="text-xs text-muted-foreground">0</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1">
									<Button size="icon" variant="ghost" onclick={() => copySecret(wh.secret)}><Copy class="w-3.5 h-3.5" /></Button>
									<Button size="icon" variant="ghost" onclick={() => deleteWebhook(wh.id)}><Trash2 class="w-3.5 h-3.5 text-destructive" /></Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="6" class="text-center py-8 text-muted-foreground">
								<Webhook class="w-8 h-8 mx-auto mb-2 opacity-50" />
								No webhooks configured.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</CardContent>
	</Card>
</div>

<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Webhook</Dialog.Title>
			<Dialog.Description>Receive real-time HTTP callbacks when events occur.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label>URL</Label>
				<Input bind:value={form.url} placeholder="https://your-app.com/webhook" />
			</div>
			<div class="space-y-2">
				<Label>Events</Label>
				<div class="flex flex-wrap gap-2">
					{#each eventOptions as ev}
						<Button
							variant={form.events.includes(ev) ? 'default' : 'outline'}
							size="sm"
							onclick={() => toggleEvent(ev)}
						>{ev}</Button>
					{/each}
				</div>
			</div>
			<div class="space-y-2">
				<Label>Secret (optional)</Label>
				<Input bind:value={form.secret} placeholder="Leave empty to auto-generate" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showDialog = false}>Cancel</Button>
			<Button onclick={createWebhook} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
