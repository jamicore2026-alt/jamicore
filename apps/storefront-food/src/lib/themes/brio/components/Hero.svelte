<script lang="ts">
  interface Props {
    headline?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    backgroundImage?: string;
  }

  let {
    headline = 'Fresh Flavors, Delivered to You',
    subtitle = 'Explore our handcrafted menu made with locally sourced ingredients.',
    ctaLabel = 'Explore Menu',
    ctaHref = '/menu',
    backgroundImage = '',
  }: Props = $props();
</script>

<section
  class="relative w-full py-16 md:py-24 px-4 text-center"
  style="background-color: #e8f5e9;">
  {#if backgroundImage}
    <img
      src={backgroundImage}
      alt=""
      class="absolute inset-0 w-full h-full object-cover opacity-20"
    />
  {/if}

  <div class="relative z-10 max-w-2xl mx-auto">
    <h1 class="text-3xl md:text-5xl font-bold mb-4" style="color: #1a1a1a;">
      {headline}
    </h1>
    <p class="text-base md:text-lg mb-8" style="color: #666666;">
      {subtitle}
    </p>
    <a
      href={ctaHref}
      class="inline-block px-8 py-3 rounded text-sm font-semibold text-white transition-colors hover:opacity-90"
      style="background-color: #1a4d2e; border-radius: 4px;"
    >
      {ctaLabel}
    </a>
  </div>
</section>
