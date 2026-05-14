<script lang="ts">
  import BrioContact from '$lib/themes/brio/routes/contact/+page.svelte';
  let { data } = $props();
</script>

<BrioContact {data} />
