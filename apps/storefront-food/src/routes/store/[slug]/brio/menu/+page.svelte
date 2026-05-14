<script lang="ts">
  import BrioMenu from '$lib/themes/brio/routes/menu/+page.svelte';
  let { data } = $props();
</script>

<BrioMenu {data} />
