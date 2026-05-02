<script lang="ts">
  import type { HeroSlide } from '@repo/shared-types';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  interface Props {
    slides: HeroSlide[];
    heroType?: 'static' | 'slideshow';
    sectionConfig?: Record<string, unknown>;
  }

  let { slides = [], heroType = 'static' }: Props = $props();

  let currentSlide = $state(0);
  let isTransitioning = $state(false);

  const slidesCount = $derived(slides?.length ?? 0);

  $effect(() => {
    if (heroType !== 'slideshow' || slidesCount <= 1) return;

    const interval = setInterval(() => {
      isTransitioning = true;
      setTimeout(() => {
        currentSlide = (currentSlide + 1) % slidesCount;
        isTransitioning = false;
      }, 600);
    }, 5000);

    return () => clearInterval(interval);
  });

  function textPositionClass(position: 'left' | 'center' | 'right'): string {
    switch (position) {
      case 'left':
        return 'text-left items-start';
      case 'right':
        return 'text-right items-end';
      default:
        return 'text-center items-center';
    }
  }

  function goToSlide(index: number) {
    if (index === currentSlide) return;
    isTransitioning = true;
    setTimeout(() => {
      currentSlide = index;
      isTransitioning = false;
    }, 600);
  }

  let activeSlide = $derived(slides?.[currentSlide] ?? slides?.[0] ?? null);
</script>

{#if activeSlide}
  <section class="relative w-full overflow-hidden bg-[var(--color-secondary)]" style="min-height: 480px;">
    <!-- Background image with fade transition -->
    {#each slides as slide, i}
      <div
        class="absolute inset-0 transition-opacity duration-600 ease-in-out"
        class:opacity-100={i === currentSlide && !isTransitioning}
        class:opacity-0={i !== currentSlide || isTransitioning}
      >
        <img
          src={slide.imageUrl}
          alt=""
          class="h-full w-full object-cover"
          loading={i === 0 ? 'eager' : 'lazy'}
        />
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-black"
          style="opacity: {slide.overlayOpacity};"
        ></div>
      </div>
    {/each}

    <!-- Content -->
    <div
      class={cn(
        'relative z-10 flex flex-col justify-center px-6 py-16 sm:px-12 md:px-16 lg:px-24',
        'max-w-7xl mx-auto w-full',
        'min-h-[480px]',
        textPositionClass(activeSlide.textPosition)
      )}
    >
      <div
        class="transition-opacity duration-500 ease-in-out"
        class:opacity-0={isTransitioning}
        class:opacity-100={!isTransitioning}
      >
        <h1
          class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 max-w-2xl"
        >
          {activeSlide.title}
        </h1>
        <p class="text-lg sm:text-xl text-white/80 mb-8 max-w-xl leading-relaxed">
          {activeSlide.subtitle}
        </p>
        {#if activeSlide.ctaText}
          <Button
            href={activeSlide.ctaLink}
            size="lg"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-semibold px-8 py-3 rounded-[var(--radius-md)]"
          >
            {activeSlide.ctaText}
          </Button>
        {/if}
      </div>
    </div>

    <!-- Slideshow dots -->
    {#if heroType === 'slideshow' && slidesCount > 1}
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {#each slides as _, i}
          <button
            onclick={() => goToSlide(i)}
            class={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              i === currentSlide
                ? 'bg-white scale-125'
                : 'bg-white/50 hover:bg-white/75'
            )}
            aria-label="Go to slide {i + 1}"
            aria-current={i === currentSlide ? 'true' : undefined}
          ></button>
        {/each}
      </div>
    {/if}
  </section>
{/if}