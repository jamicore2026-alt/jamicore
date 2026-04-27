<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Search from '@lucide/svelte/icons/search';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Clock from '@lucide/svelte/icons/clock';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	const tickets = $derived(data.tickets?.tickets || []);
	const total = $derived(data.tickets?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
	const totalPages = $derived(Math.ceil(total / 20) || 1);

	const statusFilter = $derived(data.status || '');
	const priorityFilter = $derived(data.priority || '');

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		if (p > 1) params.set('page', String(p));
		else params.delete('page');
		goto(`/admin/support?${params}`, { keepFocus: true });
	}

	function updateFilter(key: 'status' | 'priority', value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		if (value) params.set(key, value);
		else params.delete(key);
		goto(`/admin/support?${params}`, { keepFocus: true });
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

	function formatDate(d: string) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Support Tickets</h1>
		<p class="text-muted-foreground">Manage customer support tickets and inquiries.</p>
	</div>

	<Card>
		<CardContent class="p-4">
			<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
					<Search class="w-4 h-4 text-muted-foreground shrink-0" />
					<span class="text-sm text-muted-foreground">Filters:</span>
				</div>
				<div class="flex flex-wrap gap-2 w-full sm:w-auto">
					<Select.Root
						type="single"
						value={statusFilter}
						onValueChange={(v) => updateFilter('status', v)}
					>
						<Select.Trigger class="w-[140px]">
							{statusFilter ? statusFilter.replace('_', ' ') : 'All Status'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">All Status</Select.Item>
							<Select.Item value="open">Open</Select.Item>
							<Select.Item value="in_progress">In Progress</Select.Item>
							<Select.Item value="resolved">Resolved</Select.Item>
							<Select.Item value="closed">Closed</Select.Item>
						</Select.Content>
					</Select.Root>

					<Select.Root
						type="single"
						value={priorityFilter}
						onValueChange={(v) => updateFilter('priority', v)}
					>
						<Select.Trigger class="w-[140px]">
							{priorityFilter ? priorityFilter : 'All Priority'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">All Priority</Select.Item>
							<Select.Item value="low">Low</Select.Item>
							<Select.Item value="medium">Medium</Select.Item>
							<Select.Item value="high">High</Select.Item>
							<Select.Item value="urgent">Urgent</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</CardContent>
	</Card>

	{#if tickets.length === 0}
		<Card>
			<CardContent class="py-16 text-center">
				<Headphones class="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
				<p class="text-lg font-medium text-muted-foreground">No tickets found</p>
				<p class="text-sm text-muted-foreground/70 mt-1">There are no support tickets matching your filters.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each tickets as ticket}
				<Card class="hover:border-primary/30 transition-colors cursor-pointer" onclick={() => goto(`/admin/support/${ticket.id}`)}>
					<CardContent class="p-4 sm:p-5">
						<div class="flex flex-col sm:flex-row sm:items-center gap-3">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<h3 class="font-medium truncate">{ticket.subject}</h3>
									<Badge variant={statusVariant(ticket.status)} class="capitalize">{ticket.status.replace('_', ' ')}</Badge>
									<Badge variant={priorityVariant(ticket.priority)} class="capitalize">{ticket.priority}</Badge>
								</div>
								<p class="text-sm text-muted-foreground mt-1 truncate">{ticket.store?.name || 'Unknown store'} · {ticket.store?.domain || '—'}</p>
								<div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
									<span class="flex items-center gap-1">
										<Clock class="w-3 h-3" />
										{formatDate(ticket.createdAt)}
									</span>
									{#if ticket.assignedAdmin}
										<span class="flex items-center gap-1">
											<MessageSquare class="w-3 h-3" />
											Assigned to {ticket.assignedAdmin.name}
										</span>
									{/if}
								</div>
							</div>
							<div class="hidden sm:flex items-center text-muted-foreground">
								<ChevronRight class="w-4 h-4" />
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-between pt-2">
				<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages} · {total} tickets</p>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
						<ChevronLeft class="w-4 h-4" />
					</Button>
					<Button variant="outline" size="sm" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
						<ChevronRight class="w-4 h-4" />
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>
