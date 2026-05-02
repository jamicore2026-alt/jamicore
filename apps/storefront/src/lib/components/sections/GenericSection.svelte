<script lang="ts">
  interface Props {
    title?: string;
  }

  let { title = 'Section' }: Props = $props();
</script>

<section class="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
  <h2 class="text-2xl font-semibold text-[var(--color-text)] mb-6">{title}</h2>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {#each Array(4) as _}
      <div class="bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 animate-pulse">
        <div class="aspect-square bg-[var(--color-border)] rounded-[var(--radius-sm)] mb-3"></div>
        <div class="h-4 bg-[var(--color-border)] rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-[var(--color-border)] rounded w-1/2"></div>
      </div>
    {/each}
  </div>
</section>