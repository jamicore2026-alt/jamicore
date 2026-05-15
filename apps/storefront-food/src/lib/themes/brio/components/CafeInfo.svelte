<script lang="ts">
  import Phone from '@lucide/svelte/icons/phone';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Clock from '@lucide/svelte/icons/clock';
  import type { Customization } from '../themeTokens';
  import { getTokens } from '../themeTokens';

  interface Props {
    phone?: string;
    address?: string;
    hours?: string;
    mapEmbedUrl?: string;
    customization?: Customization;
  }

  let { phone = '', address = '', hours = '', mapEmbedUrl = '', customization = {} }: Props = $props();
  const t = $derived(getTokens(customization));
</script>

<div
  class="p-6"
  style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
>
  <h3 class="font-semibold text-base mb-4" style="color: {t.textColor};">Visit Us</h3>

  <div class="space-y-4">
    {#if phone}
      <div class="flex items-start gap-3">
        <div class="mt-0.5 shrink-0">
          <Phone class="w-4 h-4" style="color: {t.primaryColor};" />
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium mb-0.5" style="color: {t.textMuted};">Phone</p>
          <a href={`tel:${phone}`} class="text-sm font-medium hover:opacity-80 transition-opacity break-all" style="color: {t.textColor};">
            {phone}
          </a>
        </div>
      </div>
    {/if}

    {#if address}
      <div class="flex items-start gap-3">
        <div class="mt-0.5 shrink-0">
          <MapPin class="w-4 h-4" style="color: {t.primaryColor};" />
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium mb-0.5" style="color: {t.textMuted};">Address</p>
          <p class="text-sm font-medium break-words" style="color: {t.textColor};">{address}</p>
        </div>
      </div>
    {/if}

    {#if hours}
      <div class="flex items-start gap-3">
        <div class="mt-0.5 shrink-0">
          <Clock class="w-4 h-4" style="color: {t.primaryColor};" />
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium mb-0.5" style="color: {t.textMuted};">Hours</p>
          <p class="text-sm font-medium whitespace-pre-line break-words" style="color: {t.textColor};">{hours}</p>
        </div>
      </div>
    {/if}
  </div>

  {#if mapEmbedUrl}
    <div class="mt-6 w-full overflow-hidden" style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};">
      <iframe
        title="Location map"
        src={mapEmbedUrl}
        width="100%"
        height="240"
        style="border: 0;"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  {/if}
</div>
