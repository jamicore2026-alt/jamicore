<script lang="ts">
  import type { Customization } from '../themeTokens';
  import { getTokens, btnClasses, btnStyle } from '../themeTokens';

  interface Props {
    headline?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    backgroundImage?: string;
    customization?: Customization;
  }

  let {
    headline = 'Fresh Flavors, Delivered to You',
    subtitle = 'Explore our handcrafted menu made with locally sourced ingredients.',
    ctaLabel = 'Explore Menu',
    ctaHref = '/menu',
    backgroundImage = '',
    customization = {},
  }: Props = $props();

  const t = $derived(getTokens(customization));

  const overlayBg = $derived(
    t.heroOverlay === 'dark' ? 'rgba(0,0,0,0.5)' :
    t.heroOverlay === 'light' ? 'rgba(255,255,255,0.6)' :
    'transparent'
  );
  const overlayTextColor = $derived(
    t.heroOverlay === 'dark' ? '#ffffff' :
    t.heroOverlay === 'light' ? t.textColor :
    t.textColor
  );
</script>

<section
  class="relative w-full {t.spacingClass} px-4 text-center overflow-hidden"
  style="background-color: {t.primaryLight};"
>
  {#if backgroundImage}
    <img
      src={backgroundImage}
      alt=""
      class="absolute inset-0 w-full h-full object-cover"
    />
    <div
      class="absolute inset-0"
      style="background-color: {overlayBg};"
    ></div>
  {/if}

  <div class="relative z-10 max-w-2xl mx-auto">
    <h1
      class="text-3xl md:text-5xl font-bold mb-4 leading-tight"
      style="color: {overlayTextColor}; text-shadow: {backgroundImage && t.heroOverlay === 'none' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none'};"
    >
      {headline}
    </h1>
    <p
      class="text-base md:text-lg mb-8 max-w-xl mx-auto"
      style="color: {backgroundImage ? overlayTextColor : t.textMuted}; opacity: {backgroundImage && t.heroOverlay === 'none' ? '0.95' : '1'};"
    >
      {subtitle}
    </p>
    <a
      href={ctaHref}
      class={btnClasses(t)}
      style="{btnStyle(t)} border-radius: {t.buttonStyle === 'rounded' ? '9999px' : t.radiusPx};"
    >
      {ctaLabel}
    </a>
  </div>
</section>
