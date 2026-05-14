<script lang="ts">
  import BrioProduct from '$lib/themes/brio/routes/product/[slug]/+page.svelte';
  let { data } = $props();
</script>

<BrioProduct {data} />
