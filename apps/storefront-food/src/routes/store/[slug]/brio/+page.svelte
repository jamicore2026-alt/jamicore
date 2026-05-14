<script lang="ts">
  import BrioHome from '$lib/themes/brio/routes/+page.svelte';
  let { data } = $props();
</script>

<BrioHome {data} />
