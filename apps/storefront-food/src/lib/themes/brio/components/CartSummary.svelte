<script lang="ts">
  import type { Customization } from '../themeTokens';
  import { getTokens } from '../themeTokens';

  interface Props {
    subtotal: number;
    customization?: Customization;
  }

  let { subtotal, customization = {} }: Props = $props();
  const t = $derived(getTokens(customization));
</script>

<div
  class="p-4"
  style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
>
  <h3 class="font-semibold text-base mb-4" style="color: {t.textColor};">Order Summary</h3>

  <div class="flex items-center justify-between text-sm mb-2">
    <span style="color: {t.textMuted};">Subtotal</span>
    <span class="font-medium" style="color: {t.textColor};">${subtotal.toFixed(2)}</span>
  </div>

  <div class="flex items-center justify-between text-sm pt-3 mt-3"
    style="border-top: 1px solid {t.borderColor};"
  >
    <span class="font-semibold" style="color: {t.textColor};">Total</span>
    <span class="font-bold text-lg" style="color: {t.textColor};">${subtotal.toFixed(2)}</span>
  </div>
</div>
