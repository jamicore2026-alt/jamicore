<script lang="ts">
  import BrioCart from '$lib/themes/brio/routes/cart/+page.svelte';
  let { data } = $props();
</script>

<BrioCart {data} />
