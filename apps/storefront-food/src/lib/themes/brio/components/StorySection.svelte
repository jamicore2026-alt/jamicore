<script lang="ts">
  import type { Customization } from '../themeTokens';
  import { getTokens } from '../themeTokens';

  interface Props {
    story?: string;
    customization?: Customization;
  }

  let { story = '', customization = {} }: Props = $props();
  const t = $derived(getTokens(customization));
</script>

<section class="{t.spacingClass} px-4" style="background-color: {t.bgColor};">
  <div class="max-w-3xl mx-auto text-center">
    <h2 class="text-2xl md:text-3xl font-bold mb-6" style="color: {t.textColor};">Our Story</h2>
    {#if story}
      <p class="text-base leading-relaxed" style="color: {t.textMuted};">{story}</p>
    {:else}
      <p class="text-base leading-relaxed" style="color: {t.textMuted};">
        Welcome to our kitchen. We believe in honest food made with passion and the freshest ingredients. Every dish tells a story of tradition, care, and a love for great flavor.
      </p>
    {/if}
  </div>
</section>
