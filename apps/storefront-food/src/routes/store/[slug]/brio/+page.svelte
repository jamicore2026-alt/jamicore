<script lang="ts">
  import BrioHome from '$lib/themes/brio/routes/+page.svelte';
  import SeoMeta from '$lib/components/SeoMeta.svelte';
  let { data } = $props();
</script>

<SeoMeta
  title={data.store?.name ?? 'Store'}
  description={data.store?.heroSubtitle ?? 'Order online from our store'}
  image={data.store?.logoUrl ?? ''}
/>

<BrioHome {data} />
