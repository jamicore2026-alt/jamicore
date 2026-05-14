<script lang="ts">
  import ContactForm from '../../components/ContactForm.svelte';
  import CafeInfo from '../../components/CafeInfo.svelte';

  interface Props {
    data: {
      theme?: Record<string, unknown>;
    };
  }

  let { data }: Props = $props();

  const theme = $derived((data.theme || {}) as Record<string, unknown>);
</script>

<div class="max-w-6xl mx-auto py-16 px-4">
  <h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: #1a1a1a;">Contact Us</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <ContactForm />
    <CafeInfo
      phone={String(theme.phone || '')}
      address={String(theme.address || '')}
      hours={String(theme.hours || '')}
      mapEmbedUrl={String(theme.mapEmbedUrl || '')}
    />
  </div>
</div>
