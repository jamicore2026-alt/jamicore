<script lang="ts">
  interface Props {
    storeName?: string;
  }

  let { storeName = 'Brio' }: Props = $props();
</script>

<footer class="py-10" style="background-color: #1a4d2e; color: #ffffff;">
  <div class="max-w-6xl mx-auto px-4 text-center">
    <h3 class="text-xl font-bold mb-2">{storeName}</h3>
    <p class="text-sm mb-4" style="color: rgba(255,255,255,0.8);">Fresh food, served with love</p>
    <p class="text-xs" style="color: rgba(255,255,255,0.6);">
      &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
    </p>
  </div>
</footer>
