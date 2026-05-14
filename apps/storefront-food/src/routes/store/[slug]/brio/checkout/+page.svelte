<script lang="ts">
  import BrioCheckout from '$lib/themes/brio/routes/checkout/+page.svelte';
  let { data } = $props();
</script>

<BrioCheckout {data} />
