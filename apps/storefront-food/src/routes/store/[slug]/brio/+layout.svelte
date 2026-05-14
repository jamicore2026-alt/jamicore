<script lang="ts">
  import BrioLayout from '$lib/themes/brio/routes/+layout.svelte';
  let { data, children } = $props();
</script>

<BrioLayout {data}>
  {@render children()}
</BrioLayout>
