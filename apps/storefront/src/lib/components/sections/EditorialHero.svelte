<script lang="ts">
  import type { HeroSlide } from '@repo/shared-types';
  import { cn } from '$lib/utils';

  interface Props {
    slides: HeroSlide[];
    heroType?: 'static' | 'slideshow';
    sectionConfig?: Record<string, unknown>;
  }

  let { slides = [], heroType = 'static' }: Props = $props();

  let currentSlide = $state(0);
  let isTransitioning = $state(false);
  let isHovering = $state(false);

  const slidesCount = $derived(slides?.length ?? 0);

  $effect(() => {
    if (heroType !== 'slideshow' || slidesCount <= 1) return;

    const interval = setInterval(() => {
      isTransitioning = true;
      setTimeout(() => {
        currentSlide = (currentSlide + 1) % slidesCount;
        isTransitioning = false;
      }, 700);
    }, 6000);

    return () => clearInterval(interval);
  });

  function goToSlide(index: number) {
    if (index === currentSlide) return;
    isTransitioning = true;
    setTimeout(() => {
      currentSlide = index;
      isTransitioning = false;
    }, 700);
  }

  let activeSlide = $derived(slides?.[currentSlide] ?? slides?.[0] ?? null);
</script>

{#if activeSlide}
  <section
    class="relative w-full overflow-hidden"
    style="min-height: 560px;"
    aria-label="Hero slideshow"
    onmouseenter={() => isHovering = true}
    onmouseleave={() => isHovering = false}
  >
    <!-- Background image with slow parallax-like zoom on hover -->
    {#each slides as slide, i}
      <div
        class="absolute inset-0 transition-opacity duration-700 ease-in-out"
        class:opacity-100={i === currentSlide && !isTransitioning}
        class:opacity-0={i !== currentSlide || isTransitioning}
      >
        <img
          src={slide.imageUrl}
          alt=""
          class={cn(
            'h-full w-full object-cover transition-transform duration-[2000ms] ease-out',
            isHovering && i === currentSlide ? 'scale-105' : 'scale-100'
          )}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      </div>
    {/each}

    <!-- Minimal dark overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

    <!-- Content: editorial/magazine style -->
    <div
      class={cn(
        'relative z-10 flex flex-col justify-end px-6 py-16 sm:px-12 md:px-20 lg:px-28',
        'max-w-7xl mx-auto w-full',
        'min-h-[560px]'
      )}
    >
      <div
        class="transition-opacity duration-600 ease-in-out max-w-xl"
        class:opacity-0={isTransitioning}
        class:opacity-100={!isTransitioning}
      >
        <!-- Thin decorative rule -->
        <div class="w-12 h-px bg-[var(--color-secondary)] mb-6"></div>

        <h1
          class="text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-[1.1] mb-4 tracking-tight"
          style="font-family: var(--font-family);"
        >
          {activeSlide.title}
        </h1>
        <p class="text-base sm:text-lg text-white/70 mb-8 leading-relaxed font-light">
          {activeSlide.subtitle}
        </p>
        {#if activeSlide.ctaText}
          <a
            href={activeSlide.ctaLink}
            class="inline-flex items-center gap-2 text-white text-sm uppercase tracking-[0.2em] font-medium group/link"
          >
            {activeSlide.ctaText}
            <span class="inline-block transition-transform duration-300 group-hover/link:translate-x-1">
              &rarr;
            </span>
          </a>
        {/if}
      </div>
    </div>

    <!-- Slideshow indicators: minimal line style -->
    {#if heroType === 'slideshow' && slidesCount > 1}
      <div class="absolute bottom-8 right-6 sm:right-12 z-20 flex gap-3">
        {#each slides as _, i}
          <button
            onclick={() => goToSlide(i)}
            class={cn(
              'h-px transition-all duration-500',
              i === currentSlide
                ? 'w-10 bg-white'
                : 'w-6 bg-white/30 hover:bg-white/60'
            )}
            aria-label="Go to slide {i + 1}"
            aria-current={i === currentSlide ? 'true' : undefined}
          ></button>
        {/each}
      </div>
    {/if}
  </section>
{/if}