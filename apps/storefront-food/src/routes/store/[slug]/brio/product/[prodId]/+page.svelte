<script lang="ts">
  import BrioProduct from '$lib/themes/brio/routes/product/[slug]/+page.svelte';
  import SeoMeta from '$lib/components/SeoMeta.svelte';
  let { data } = $props();
</script>

<SeoMeta
  title="{data.item?.name || data.item?.titleEn || data.item?.title || 'Item'} | {data.store?.name ?? 'Store'}"
  description={data.item?.description || data.item?.descriptionEn || data.store?.heroSubtitle || 'Order online from our store'}
  image={data.item?.image || data.item?.images?.[0] || ''}
  type="product"
/>

<BrioProduct {data} />
