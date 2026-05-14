<script lang="ts">
  import Phone from '@lucide/svelte/icons/phone';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Clock from '@lucide/svelte/icons/clock';

  interface Props {
    phone?: string;
    address?: string;
    hours?: string;
    mapEmbedUrl?: string;
  }

  let { phone = '', address = '', hours = '', mapEmbedUrl = '' }: Props = $props();
</script>

<div
  class="bg-white border p-6"
  style="border-color: #e5e5e5; border-radius: 4px;"
>
  <h3 class="font-semibold text-base mb-4" style="color: #1a1a1a;">Visit Us</h3>

  <div class="space-y-4">
    {#if phone}
      <div class="flex items-start gap-3">
        <div class="mt-0.5">
          <Phone class="w-4 h-4" style="color: #1a4d2e;" />
        </div>
        <div>
          <p class="text-xs font-medium mb-0.5" style="color: #666666;">Phone</p>
          <a href={`tel:${phone}`} class="text-sm font-medium hover:text-[#1a4d2e] transition-colors" style="color: #1a1a1a;">
            {phone}
          </a>
        </div>
      </div>
    {/if}

    {#if address}
      <div class="flex items-start gap-3">
        <div class="mt-0.5">
          <MapPin class="w-4 h-4" style="color: #1a4d2e;" />
        </div>
        <div>
          <p class="text-xs font-medium mb-0.5" style="color: #666666;">Address</p>
          <p class="text-sm font-medium" style="color: #1a1a1a;">{address}</p>
        </div>
      </div>
    {/if}

    {#if hours}
      <div class="flex items-start gap-3">
        <div class="mt-0.5">
          <Clock class="w-4 h-4" style="color: #1a4d2e;" />
        </div>
        <div>
          <p class="text-xs font-medium mb-0.5" style="color: #666666;">Hours</p>
          <p class="text-sm font-medium whitespace-pre-line" style="color: #1a1a1a;">{hours}</p>
        </div>
      </div>
    {/if}
  </div>

  {#if mapEmbedUrl}
    <div class="mt-6 w-full overflow-hidden" style="border: 1px solid #e5e5e5; border-radius: 4px;">
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
