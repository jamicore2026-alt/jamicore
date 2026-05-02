<script lang="ts">
  
  interface Testimonial {
    name: string;
    content: string;
    rating: number;
    avatar?: string;
  }

  interface Props {
    testimonials?: Testimonial[];
    sectionConfig?: Record<string, unknown>;
  }

  let { testimonials = [] }: Props = $props();

  function renderStars(rating: number): string {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '\u2605'.repeat(full) + (half ? '\u00BD' : '') + '\u2606'.repeat(empty);
  }

  // Default testimonials when none provided
  const displayTestimonials = $derived(
    testimonials.length > 0
      ? testimonials
      : [
          { name: 'Sarah M.', content: 'Fantastic quality and super fast delivery. Will definitely order again!', rating: 5 },
          { name: 'James K.', content: 'Great selection and competitive prices. The customer service team was very helpful.', rating: 4 },
          { name: 'Amira R.', content: 'Love the easy returns process. Makes shopping stress-free.', rating: 5 },
        ]
  );
</script>

<section class="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
  <h2 class="text-2xl sm:text-3xl font-semibold text-[var(--color-text)] mb-8 text-center" style="font-family: var(--font-family);">
    What Our Customers Say
  </h2>

  <div class="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
    {#each displayTestimonials as testimonial, i (i)}
      <article
        class="flex-shrink-0 w-[85vw] sm:w-[45vw] lg:w-auto snap-start bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-5 sm:p-6 transition-shadow hover:shadow-md"
      >
        <!-- Stars -->
        <div class="text-[var(--color-accent)] text-lg mb-3 tracking-widest" aria-label="{testimonial.rating} out of 5 stars">
          {renderStars(testimonial.rating)}
        </div>

        <!-- Quote -->
        <blockquote class="text-[var(--color-text)] text-sm sm:text-base leading-relaxed mb-4">
          &ldquo;{testimonial.content}&rdquo;
        </blockquote>

        <!-- Author -->
        <div class="flex items-center gap-3">
          {#if testimonial.avatar}
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              class="w-10 h-10 rounded-full object-cover border border-[var(--color-border)]"
              loading="lazy"
            />
          {:else}
            <div class="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-semibold text-sm">
              {testimonial.name.charAt(0).toUpperCase()}
            </div>
          {/if}
          <span class="text-sm font-medium text-[var(--color-text)]">
            {testimonial.name}
          </span>
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>