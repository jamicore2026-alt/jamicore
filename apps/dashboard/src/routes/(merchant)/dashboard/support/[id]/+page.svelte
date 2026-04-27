<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Send from '@lucide/svelte/icons/send';
	import User from '@lucide/svelte/icons/user';
	import Shield from '@lucide/svelte/icons/shield';

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

	async function sendReply() {
		if (!replyText.trim()) return;
		sending = true;
		try {
			await apiFetch(`/merchant/tickets/${ticket.id}/replies`, {
				method: 'POST',
				body: JSON.stringify({ message: replyText }),
			});
			toast.success('Reply sent');
			replyText = '';
			invalidateAll();
		} catch {
			toast.error('Failed to send reply');
		} finally {
			sending = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	const replies = $derived(ticket?.replies?.slice().reverse() || []);
</script>

<div class="space-y-6 max-w-3xl">
	<Button variant="ghost" onclick={() => goto('/dashboard/support')}><ArrowLeft class="w-4 h-4 mr-1" />Back to Tickets</Button>

	{#if ticket}
		<Card>
			<CardHeader>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<CardTitle>{ticket.subject}</CardTitle>
					<div class="flex items-center gap-2">
						<Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
						<Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge>
					</div>
				</div>
				<p class="text-sm text-muted-foreground">{formatDate(ticket.createdAt)}</p>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm">{ticket.description}</p>
			</CardContent>
		</Card>

		{#if replies.length > 0}
			<div class="space-y-3">
				<h3 class="text-sm font-semibold text-muted-foreground">Replies ({replies.length})</h3>
				{#each replies as reply (reply.id)}
					<Card>
						<CardContent class="p-4">
							<div class="flex items-center gap-2 mb-2">
								{#if reply.authorType === 'superadmin'}
									<Shield class="w-4 h-4 text-primary" />
									<span class="text-sm font-medium">Support Team</span>
								{:else}
									<User class="w-4 h-4 text-muted-foreground" />
									<span class="text-sm font-medium">You</span>
								{/if}
								<span class="text-xs text-muted-foreground ml-auto">{formatDate(reply.createdAt)}</span>
							</div>
							<p class="text-sm">{reply.message}</p>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}

		<Card>
			<CardContent class="p-4 space-y-3">
				<Textarea bind:value={replyText} placeholder="Write a reply..." rows={3} />
				<Button onclick={sendReply} disabled={sending || !replyText.trim()}>
					<Send class="w-4 h-4 mr-1" />{sending ? 'Sending...' : 'Send Reply'}
				</Button>
			</CardContent>
		</Card>
	{:else}
		<Card><CardContent class="p-8 text-center text-muted-foreground">Ticket not found.</CardContent></Card>
	{/if}
</div>
