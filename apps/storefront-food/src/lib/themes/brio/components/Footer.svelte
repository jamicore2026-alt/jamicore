<script lang="ts">
  import type { Customization } from '../themeTokens';
  import { getTokens } from '../themeTokens';

  interface Props {
    storeName?: string;
    customization?: Customization;
  }

  let { storeName = 'Brio', customization = {} }: Props = $props();
  const t = $derived(getTokens(customization));
</script>

<footer class="py-10" style="background-color: {t.footerBg}; color: {t.footerText};">
  <div class="max-w-6xl mx-auto px-4 text-center">
    <h3 class="text-xl font-bold mb-2">{storeName}</h3>
    <p class="text-sm mb-4" style="color: {t.footerText}; opacity: 0.8;">Fresh food, served with love</p>
    <p class="text-xs" style="color: {t.footerText}; opacity: 0.6;">
      &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
    </p>
  </div>
</footer>
