<script lang="ts">
  import type { PageData } from './$types.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Star, Trash2, Pencil } from '@lucide/svelte';
  import { getCookie } from '$lib/api/client.js';

  let { data }: { data: PageData } = $props();

  let reviews = $state(data.reviews);
  let deleting = $state<Set<string>>(new Set());

  async function deleteReview(id: string) {
    deleting.add(id);
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch(`/api/v1/customer/reviews/${id}`, {
        method: 'DELETE',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        credentials: 'include',
      });
      if (res.ok) {
        reviews = reviews.filter((r: any) => r.id !== id);
      }
    } catch {
      // failed
    } finally {
      deleting.delete(id);
    }
  }
</script>

<svelte:head>
  <title>Reviews | My Account</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold text-[var(--color-text)] mb-6">My Reviews</h1>

  {#if reviews.length === 0}
    <p class="text-[var(--color-text-secondary)] text-center py-8">You haven't written any reviews yet</p>
  {:else}
    <div class="space-y-4">
      {#each reviews as review (review.id)}
        <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-1 mb-1">
                {#each [1, 2, 3, 4, 5] as star}
                  <Star
                    class="size-4 {star <= review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-[var(--color-border)]'}"
                  />
                {/each}
              </div>
              {#if review.title}
                <h3 class="text-sm font-semibold text-[var(--color-text)]">{review.title}</h3>
              {/if}
              <p class="text-sm text-[var(--color-text-secondary)] mt-1">{review.content}</p>
              <p class="text-xs text-[var(--color-text-secondary)] mt-2">
                Product: {review.productId?.slice(0, 12) ?? 'Unknown'} &middot;
                {new Date(review.createdAt).toLocaleDateString()}
              </p>
              {#if review.isVerified}
                <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">Verified Purchase</span>
              {/if}
            </div>
            <Button
              variant="ghost"
              size="icon"
              class="text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
              onclick={() => deleteReview(review.id)}
              disabled={deleting.has(review.id)}
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>