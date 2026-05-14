<script lang="ts">
  import BrioCategory from '$lib/themes/brio/routes/menu/[slug]/+page.svelte';
  let { data } = $props();
</script>

<BrioCategory {data} />
