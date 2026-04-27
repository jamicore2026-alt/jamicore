<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	let showDialog = $state(false);
	let form = $state({ subject: '', description: '', priority: 'medium' });
	let submitting = $state(false);

	const tickets = $derived(data.tickets?.tickets || []);
	const total = $derived(data.tickets?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20) || 1);
	const statusFilter = $derived(data.status || '');

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		if (p > 1) params.set('page', String(p));
		else params.delete('page');
		goto(`/dashboard/support?${params}`, { keepFocus: true });
	}

	function updateStatus(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		if (value) params.set('status', value);
		else params.delete('status');
		goto(`/dashboard/support?${params}`, { keepFocus: true });
	}

	function statusVariant(s: string) {
		switch (s) {
			case 'open': return 'default';
			case 'in_progress': return 'secondary';
			case 'resolved': return 'outline';
			case 'closed': return 'secondary';
			default: return 'secondary';
		}
	}

	function priorityVariant(p: string) {
		switch (p) {
			case 'urgent': return 'destructive';
			case 'high': return 'default';
			case 'medium': return 'secondary';
			case 'low': return 'outline';
			default: return 'secondary';
		}
	}

	async function handleSubmit() {
		if (!form.subject.trim() || !form.description.trim()) {
			toast.error('Subject and description are required');
			return;
		}
		submitting = true;
		try {
			await apiFetch('/merchant/tickets', {
				method: 'POST',
				body: JSON.stringify(form),
			});
			toast.success('Ticket created');
			showDialog = false;
			form = { subject: '', description: '', priority: 'medium' };
			invalidateAll();
		} catch {
			toast.error('Failed to create ticket');
		} finally {
			submitting = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Support</h1>
			<p class="text-muted-foreground">Submit and track support tickets.</p>
		</div>
		<Button onclick={() => showDialog = true}><Plus class="w-4 h-4 mr-1" />New Ticket</Button>
	</div>

	<div class="flex items-center gap-2">
		<Select.Root type="single" value={statusFilter} onValueChange={updateStatus}>
			<Select.Trigger class="w-[160px]">{statusFilter ? `Status: ${statusFilter}` : 'Filter by status'}</Select.Trigger>
			<Select.Content>
				<Select.Item value="">All</Select.Item>
				<Select.Item value="open">Open</Select.Item>
				<Select.Item value="in_progress">In Progress</Select.Item>
				<Select.Item value="resolved">Resolved</Select.Item>
				<Select.Item value="closed">Closed</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<Card>
		<CardContent class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Subject</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Priority</Table.Head>
						<Table.Head>Created</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each tickets as t (t.id)}
						<Table.Row class="cursor-pointer hover:bg-muted/50">
							<Table.Cell class="font-medium"><a href="/dashboard/support/{t.id}">{t.subject}</a></Table.Cell>
							<Table.Cell><Badge variant={statusVariant(t.status)}>{t.status}</Badge></Table.Cell>
							<Table.Cell><Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge></Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm">{formatDate(t.createdAt)}</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="4" class="text-center py-8 text-muted-foreground">
								<Headphones class="w-8 h-8 mx-auto mb-2 opacity-50" />
								No tickets found.
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

<!-- New Ticket Dialog -->
<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>New Support Ticket</Dialog.Title>
			<Dialog.Description>Describe your issue and we'll get back to you.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label>Subject</Label>
				<Input bind:value={form.subject} placeholder="Brief subject line" />
			</div>
			<div class="space-y-2">
				<Label>Priority</Label>
				<Select.Root type="single" bind:value={form.priority}>
					<Select.Trigger>{form.priority}</Select.Trigger>
					<Select.Content>
						<Select.Item value="low">Low</Select.Item>
						<Select.Item value="medium">Medium</Select.Item>
						<Select.Item value="high">High</Select.Item>
						<Select.Item value="urgent">Urgent</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<Label>Description</Label>
				<Textarea bind:value={form.description} placeholder="Describe your issue in detail..." rows={4} />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showDialog = false}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>