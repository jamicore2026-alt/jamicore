<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  
  interface Props {
    title: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    bgGradient?: string;
    sectionConfig?: Record<string, unknown>;
  }

  let {
    title,
    subtitle,
    ctaText,
    ctaLink,
    bgGradient,
  }: Props = $props();

  const gradientStyle = $derived(
    bgGradient
      ? `background: ${bgGradient};`
      : `background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));`
  );
</script>

<section class="py-12 px-4 sm:px-6 lg:px-8">
  <div
    class="max-w-7xl mx-auto rounded-[var(--radius-lg)] overflow-hidden px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16"
    style={gradientStyle}
  >
    <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
      <div class="text-center sm:text-left">
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2" style="font-family: var(--font-family);">
          {title}
        </h2>
        {#if subtitle}
          <p class="text-base sm:text-lg text-white/80 leading-relaxed">
            {subtitle}
          </p>
        {/if}
      </div>
      {#if ctaText && ctaLink}
        <Button
          href={ctaLink}
          size="lg"
          class="bg-white text-[var(--color-primary)] hover:bg-white/90 font-semibold px-8 py-3 rounded-[var(--radius-md)] shrink-0 shadow-lg"
        >
          {ctaText}
        </Button>
      {/if}
    </div>
  </div>
</section>