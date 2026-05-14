<script lang="ts">
  import BrioLayout from '$lib/themes/brio/routes/+layout.svelte';
  import BrioHome from '$lib/themes/brio/routes/+page.svelte';

  let { data } = $props();
</script>

<BrioLayout {data}>
  <BrioHome {data} />
</BrioLayout>
