<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Clock from '@lucide/svelte/icons/clock';
	import User from '@lucide/svelte/icons/user';
	import Send from '@lucide/svelte/icons/send';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const ticket = $derived(data.ticket);
	let replyText = $state('');
	let sending = $state(false);

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

	async function updateStatus(status: string) {
		try {
			const res = await fetch(`/api/v1/admin/tickets/${ticket.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status }),
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to update');
			ticket.status = status;
			toast.success('Status updated');
		} catch {
			toast.error('Failed to update status');
		}
	}

	async function sendReply() {
		if (!replyText.trim()) return;
		sending = true;
		try {
			const res = await fetch(`/api/v1/admin/tickets/${ticket.id}/replies`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: replyText.trim() }),
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to send');
			const data = await res.json();
			ticket.replies = [...(ticket.replies || []), data.reply];
			replyText = '';
			toast.success('Reply sent');
		} catch {
			toast.error('Failed to send reply');
		} finally {
			sending = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-3">
		<Button variant="ghost" size="icon" onclick={() => goto('/admin/support')}>
			<ArrowLeft class="w-4 h-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Ticket Detail</h1>
			<p class="text-muted-foreground">View and manage ticket #{ticket?.id?.slice(0, 8)}</p>
		</div>
	</div>

	{#if !ticket}
		<Card>
			<CardContent class="py-12 text-center text-muted-foreground">
				<MessageSquare class="w-12 h-12 mx-auto mb-3 opacity-50" />
				<p>Ticket not found.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 lg:grid-cols-3">
			<div class="lg:col-span-2 space-y-4">
				<Card>
					<CardHeader>
						<div class="flex items-start justify-between gap-3">
							<div>
								<CardTitle class="text-lg">{ticket.subject}</CardTitle>
								<p class="text-sm text-muted-foreground mt-1">{ticket.store?.name || 'Unknown store'} · {ticket.store?.domain || '—'}</p>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<Badge variant={statusVariant(ticket.status)} class="capitalize">{ticket.status.replace('_', ' ')}</Badge>
								<Badge variant={priorityVariant(ticket.priority)} class="capitalize">{ticket.priority}</Badge>
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						<p class="text-sm leading-relaxed">{ticket.description}</p>
						<Separator />
						<div class="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
							<span class="flex items-center gap-1"><Clock class="w-3 h-3" /> Created {formatDate(ticket.createdAt)}</span>
							<span class="flex items-center gap-1"><User class="w-3 h-3" /> {ticket.store?.ownerEmail || '—'}</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="text-base">Replies</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if !ticket.replies || ticket.replies.length === 0}
							<p class="text-sm text-muted-foreground text-center py-4">No replies yet.</p>
						{:else}
							{#each ticket.replies as reply}
								<div class="flex gap-3">
									<div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
										{reply.authorType === 'superadmin' ? 'A' : 'M'}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium">{reply.authorType === 'superadmin' ? 'Admin' : 'Merchant'}</span>
											<span class="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
										</div>
										<p class="text-sm mt-1">{reply.message}</p>
									</div>
								</div>
								{#if reply !== ticket.replies[ticket.replies.length - 1]}
									<Separator />
								{/if}
							{/each}
						{/if}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="text-base">Reply</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						<Textarea placeholder="Type your reply..." bind:value={replyText} rows={4} />
						<div class="flex justify-end">
							<Button onclick={sendReply} disabled={sending || !replyText.trim()}>
								<Send class="w-4 h-4 mr-2" />
								{sending ? 'Sending...' : 'Send Reply'}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div class="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Actions</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						<Select.Root type="single" value={ticket.status} onValueChange={(v) => updateStatus(v)}>
							<Select.Trigger class="w-full">
								Update Status: {ticket.status.replace('_', ' ')}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="open">Open</Select.Item>
								<Select.Item value="in_progress">In Progress</Select.Item>
								<Select.Item value="resolved">Resolved</Select.Item>
								<Select.Item value="closed">Closed</Select.Item>
							</Select.Content>
						</Select.Root>
					</CardContent>
				</Card>
			</div>
		</div>
	{/if}
</div>
