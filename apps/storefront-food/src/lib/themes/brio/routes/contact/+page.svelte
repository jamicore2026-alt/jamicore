<script lang="ts">
  import ContactForm from '../../components/ContactForm.svelte';
  import CafeInfo from '../../components/CafeInfo.svelte';
  import { getTokens } from '../../themeTokens';

  interface Props {
    data: {
      theme?: Record<string, unknown>;
    };
  }

  let { data }: Props = $props();

  const theme = $derived((data.theme || {}) as Record<string, unknown>);
  const customization = $derived((theme.customization as Record<string, string>) || {});
  const t = $derived(getTokens(customization));
</script>

<div class="max-w-6xl mx-auto {t.spacingClass} px-4">
  <h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: {t.textColor};">Contact Us</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <ContactForm {customization} />
    <CafeInfo
      phone={String(theme.contactPhone || '')}
      address={String(theme.contactAddress || '')}
      hours={String(theme.contactHours || '')}
      mapEmbedUrl={String(theme.googleMapsUrl || '')}
      {customization}
    />
  </div>
</div>
