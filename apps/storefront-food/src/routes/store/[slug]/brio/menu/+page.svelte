<script lang="ts">
  import BrioMenu from '$lib/themes/brio/routes/menu/+page.svelte';
  import SeoMeta from '$lib/components/SeoMeta.svelte';
  let { data } = $props();
</script>

<SeoMeta
  title="Menu | {data.store?.name ?? 'Store'}"
  description={data.store?.heroSubtitle ?? 'Browse our menu and order online'}
/>

<BrioMenu {data} />
