<script lang="ts">
  import { resolve } from '$app/paths';
  import { compareStore } from '$lib/stores/compare.svelte';
  import { X, ArrowRight } from '@lucide/svelte';

  function removeItem(id: string) {
    compareStore.remove(id);
  }

  function clearAll() {
    compareStore.clear();
  }
</script>

{#if compareStore.items.length > 0}
  <div class="fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 overflow-x-auto">
          <span class="text-sm font-medium text-[var(--color-text)] shrink-0">
            Compare ({compareStore.items.length})
          </span>
          {#each compareStore.items as item (item.id)}
            <div class="flex items-center gap-2 shrink-0 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5">
              <span class="text-xs font-medium text-[var(--color-text)] truncate max-w-[120px]">{item.titleEn}</span>
              <button
                type="button"
                class="text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                onclick={() => removeItem(item.id)}
                aria-label="Remove {item.titleEn} from comparison"
              >
                <X class="size-3.5" />
              </button>
            </div>
          {/each}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            onclick={clearAll}
          >
            Clear
          </button>
          <a
            href={resolve('/compare')}
            class="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-[var(--color-primary)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
          >
            Compare Now
            <ArrowRight class="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  </div>
{/if}
