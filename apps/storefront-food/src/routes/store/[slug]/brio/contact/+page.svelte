<script lang="ts">
  import BrioContact from '$lib/themes/brio/routes/contact/+page.svelte';
  import SeoMeta from '$lib/components/SeoMeta.svelte';
  let { data } = $props();
</script>

<SeoMeta
  title="Contact | {data.store?.name ?? 'Store'}"
  description={data.store?.heroSubtitle ?? 'Get in touch with our store'}
/>

<BrioContact {data} />
