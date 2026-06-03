<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import Star from '@lucide/svelte/icons/star';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	interface Review {
		id: string;
		rating: number;
		comment: string | null;
		merchantResponse: string | null;
	}

	const reviews = $derived(data.reviews?.reviews || []);
	const total = $derived(data.reviews?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	let respondDialog = $state(false);
	let selectedReview = $state<Review | null>(null);
	let responseText = $state('');
	let sending = $state(false);

	const statusFilters = ['', 'pending', 'approved', 'rejected'];

	function filterByStatus(s: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (s) params.set('status', s);
		else params.delete('status');
		params.set('page', '1');
		goto(`/dashboard/reviews?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/reviews?${params}`);
	}

	async function approveReview(id: string) {
		try {
			await apiFetch(`/merchant/reviews/${id}/approve`, { method: 'POST' });
			toast.success('Review approved');
			invalidateAll();
		} catch { toast.error('Failed to approve'); }
	}

	async function rejectReview(id: string) {
		try {
			await apiFetch(`/merchant/reviews/${id}/reject`, { method: 'POST' });
			toast.success('Review rejected');
			invalidateAll();
		} catch { toast.error('Failed to reject'); }
	}

	function openRespond(review: Review) {
		selectedReview = review;
		responseText = review.merchantResponse || '';
		respondDialog = true;
	}

	async function submitResponse() {
		if (!selectedReview) return;
		sending = true;
		try {
			await apiFetch(`/merchant/reviews/${selectedReview.id}/respond`, {
				method: 'POST',
				body: JSON.stringify({ response: responseText }),
			});
			toast.success('Response submitted');
			respondDialog = false;
			invalidateAll();
		} catch (err) { toast.error(errorMessage(err) || 'Failed'); }
		finally { sending = false; }
	}

	function renderStars(rating: number) {
		return '★'.repeat(rating) + '☆'.repeat(5 - rating);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Reviews</h1>
		<p class="text-muted-foreground">Moderate customer reviews and respond</p>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each statusFilters as s}
			<Button variant={data.status === s ? 'default' : 'outline'} size="sm" onclick={() => filterByStatus(s)}>
				{s || 'All'}
			</Button>
		{/each}
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} review{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if reviews.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Star class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No reviews found</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each reviews as review (review.id)}
						<div class="p-4 hover:bg-muted/30 transition-colors">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="text-amber-500 text-sm tracking-wider">{renderStars(review.rating)}</span>
										<Badge variant={review.isApproved === true ? 'default' : review.isApproved === false ? 'destructive' : 'secondary'} class="text-xs">
											{review.isApproved === true ? 'Approved' : review.isApproved === false ? 'Rejected' : 'Pending'}
										</Badge>
									</div>
									<p class="font-medium text-sm">{review.title || 'No title'}</p>
									<p class="text-sm text-muted-foreground mt-1 line-clamp-2">{review.comment}</p>
									<div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
										<span>{review.customer?.email || review.customerEmail || 'Anonymous'}</span>
										<span>•</span>
										<span>{review.product?.titleEn || 'Product'}</span>
										<span>•</span>
										<span>{formatDate(review.createdAt)}</span>
									</div>
									{#if review.merchantResponse}
										<div class="mt-2 p-2 rounded bg-muted/50 text-xs">
											<span class="font-medium">Your response:</span> {review.merchantResponse}
										</div>
									{/if}
								</div>
								<div class="flex items-center gap-1 shrink-0">
									{#if review.isApproved !== true}
										<button onclick={() => approveReview(review.id)} class="p-1.5 rounded hover:bg-success/10" title="Approve">
											<Check class="w-4 h-4 text-success" />
										</button>
									{/if}
									{#if review.isApproved !== false}
										<button onclick={() => rejectReview(review.id)} class="p-1.5 rounded hover:bg-destructive/10" title="Reject">
											<X class="w-4 h-4 text-destructive" />
										</button>
									{/if}
									<button onclick={() => openRespond(review)} class="p-1.5 rounded hover:bg-muted" title="Respond">
										<MessageSquare class="w-4 h-4 text-muted-foreground" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>

				{#if totalPages > 1}
					<Separator />
					<div class="flex items-center justify-between p-4">
						<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
						<div class="flex gap-1">
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
		</CardContent>
	</Card>
</div>

<Dialog.Root bind:open={respondDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Respond to Review</Dialog.Title>
			<Dialog.Description>
				{#if selectedReview}
					<span class="text-amber-500">{renderStars(selectedReview.rating)}</span> — {selectedReview.comment?.slice(0, 80)}...
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); submitResponse(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="response">Your Response</Label>
				<Textarea id="response" bind:value={responseText} rows={3} placeholder="Thank you for your feedback..." />
			</div>
			<div class="flex justify-end gap-3">
				<Button variant="outline" type="button" onclick={() => respondDialog = false}>Cancel</Button>
				<Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Submit Response'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
