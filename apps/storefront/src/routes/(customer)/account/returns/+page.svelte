<script lang="ts">
  import type { PageData } from './$types.js';
  import { formatPrice } from '$lib/utils/format.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import ProductPagination from '$lib/components/product/ProductPagination.svelte';

  let { data }: { data: PageData } = $props();

  let statusFilter = $state('all');

  let filteredReturns = $derived(
    statusFilter === 'all'
      ? data.returns
      : data.returns.filter((r: any) => r.status === statusFilter)
  );

  const statusColors: Record<string, string> = {
    requested: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    received: 'bg-purple-100 text-purple-700',
    inspected: 'bg-indigo-100 text-indigo-700',
    refunded: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };
</script>

<svelte:head>
  <title>Returns | My Account</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold text-[var(--color-text)] mb-6">Return Requests</h1>

  <!-- Status filter tabs -->
  <div class="flex flex-wrap gap-2 mb-6">
    {#each ['all', 'requested', 'approved', 'received', 'inspected', 'refunded', 'rejected', 'cancelled'] as status}
      <button
        class="px-3 py-1.5 text-sm rounded-[var(--radius-md)] transition-colors {statusFilter === status
          ? 'bg-[var(--color-primary)] text-white font-medium'
          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]'}"
        onclick={() => (statusFilter = status)}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </button>
    {/each}
  </div>

  {#if filteredReturns.length === 0}
    <div class="text-center py-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
      <p class="text-[var(--color-text-secondary)]">No return requests found</p>
      <a href="/account/orders" class="inline-block mt-2 text-sm text-[var(--color-primary)] hover:underline">
        View orders to request a return
      </a>
    </div>
  {:else}
    <div class="space-y-4">
      {#each filteredReturns as ret (ret.id)}
        <div
          class="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-primary)]/30 transition-colors"
        >
          <div class="flex items-center justify-between mb-2">
            <div>
              <span class="text-sm font-semibold text-[var(--color-text)]">Order #{ret.order?.orderNumber ?? ret.orderId}</span>
              <span class="text-xs text-[var(--color-text-secondary)] ml-3">
                {new Date(ret.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Badge class={statusColors[ret.status] ?? 'bg-gray-100 text-gray-700'}>
              {ret.status}
            </Badge>
          </div>

          <p class="text-sm text-[var(--color-text-secondary)] mb-2">
            <span class="font-medium text-[var(--color-text)]">Reason:</span> {ret.reason}
          </p>

          {#if ret.notes}
            <p class="text-sm text-[var(--color-text-secondary)] mb-2">
              <span class="font-medium text-[var(--color-text)]">Notes:</span> {ret.notes}
            </p>
          {/if}

          <div class="flex items-center justify-between text-sm">
            <span class="text-[var(--color-text-secondary)]">
              {ret.items?.length ?? 0} item(s) returned
            </span>
            {#if ret.refundAmount}
              <span class="font-semibold text-[var(--color-primary)]">
                Refund: {formatPrice(ret.refundAmount)}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <ProductPagination page={data.page} total={data.total} limit={data.limit} />
  {/if}
</div>
