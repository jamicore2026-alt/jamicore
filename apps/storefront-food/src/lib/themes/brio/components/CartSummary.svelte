<script lang="ts">
  interface Props {
    subtotal: number;
  }

  let { subtotal }: Props = $props();
</script>

<div
  class="bg-white border p-4"
  style="border-color: #e5e5e5; border-radius: 4px;">
  <h3 class="font-semibold text-base mb-4" style="color: #1a1a1a;">Order Summary</h3>

  <div class="flex items-center justify-between text-sm mb-2">
    <span style="color: #666666;">Subtotal</span>
    <span class="font-medium" style="color: #1a1a1a;">${subtotal.toFixed(2)}</span>
  </div>

  <div class="flex items-center justify-between text-sm pt-3 mt-3" style="border-top: 1px solid #e5e5e5;">
    <span class="font-semibold" style="color: #1a1a1a;">Total</span>
    <span class="font-bold text-lg" style="color: #1a1a1a;">${subtotal.toFixed(2)}</span>
  </div>
</div>
