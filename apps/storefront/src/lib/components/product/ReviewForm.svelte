<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { getCookie } from '$lib/api/client.js';

  interface Props {
    productId: string;
    onSuccess?: () => void;
  }

  let { productId, onSuccess }: Props = $props();

  let rating = $state(0);
  let title = $state('');
  let content = $state('');
  let submitting = $state(false);
  let error = $state('');
  let hoverRating = $state(0);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (rating === 0) {
      error = 'Please select a rating';
      return;
    }
    if (!content.trim()) {
      error = 'Please write a review';
      return;
    }

    submitting = true;
    error = '';

    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch('/api/v1/customer/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Failed to submit review' }));
        throw new Error(data.message || 'Failed to submit review');
      }

      rating = 0;
      title = '';
      content = '';
      onSuccess?.();
    } catch (e: any) {
      error = e.message;
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if error}
    <div class="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 p-3 rounded-[var(--radius-md)]">
      {error}
    </div>
  {/if}

  <div>
    <Label class="text-sm font-medium">Rating</Label>
    <div class="flex items-center gap-1 mt-1">
      {#each [1, 2, 3, 4, 5] as star}
        <button
          type="button"
          class="p-0.5 transition-transform hover:scale-110"
          onclick={() => (rating = star)}
          onmouseenter={() => (hoverRating = star)}
          onmouseleave={() => (hoverRating = 0)}
          aria-label="Rate {star} stars"
        >
          <Star
            class="size-7 {star <= (hoverRating || rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-[var(--color-border)]'}"
          />
        </button>
      {/each}
    </div>
  </div>

  <div>
    <Label for="review-title" class="text-sm font-medium">Title (optional)</Label>
    <Input
      id="review-title"
      bind:value={title}
      placeholder="Summarize your review"
      class="mt-1"
    />
  </div>

  <div>
    <Label for="review-content" class="text-sm font-medium">Review</Label>
    <Textarea
      id="review-content"
      bind:value={content}
      placeholder="Share your experience with this product"
      rows={4}
      class="mt-1"
      required
    />
  </div>

  <Button type="submit" disabled={submitting}>
    {submitting ? 'Submitting...' : 'Submit Review'}
  </Button>
</form>