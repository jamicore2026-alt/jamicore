<script lang="ts">
  import { cn } from '$lib/utils';

  interface CategoryItem {
    id: string;
    nameEn: string;
    image?: string;
  }

  interface Props {
    categories: CategoryItem[];
    columns?: number;
    sectionConfig?: Record<string, unknown>;
  }

  let { categories, columns = 3 }: Props = $props();

  const colsClass = $derived(
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        : columns === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-3'
  );
</script>

<section class="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
  <h2 class="text-2xl sm:text-3xl font-semibold text-[var(--color-text)] mb-8" style="font-family: var(--font-family);">
    Shop by Category
  </h2>

  {#if categories.length === 0}
    <p class="text-[var(--color-text-secondary)] text-center py-8">No categories available.</p>
  {:else}
    <div class={cn('grid gap-4 sm:gap-6', colsClass)}>
      {#each categories as category (category.id)}
        <a
          href="/categories/{category.id}"
          class="group relative bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <!-- Image or placeholder -->
          <div class="relative overflow-hidden" style="aspect-ratio: 4/3;">
            {#if category.image}
              <img
                src={category.image}
                alt={category.nameEn}
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            {:else}
              <div class="h-full w-full bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center">
                <span class="text-[var(--color-primary)] text-3xl font-light">
                  {category.nameEn.charAt(0).toUpperCase()}
                </span>
              </div>
            {/if}

            <!-- Hover overlay -->
            <div class="absolute inset-0 bg-[var(--color-primary)]/0 group-hover:bg-[var(--color-primary)]/10 transition-colors duration-300"></div>
          </div>

          <!-- Label -->
          <div class="p-3 sm:p-4">
            <h3 class="text-sm sm:text-base font-medium text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
              {category.nameEn}
            </h3>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>