<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { apiFetch } from '$lib/api/client';
  import LayoutTemplate from '@lucide/svelte/icons/layout-template';
  import Image from '@lucide/svelte/icons/image';
  import Phone from '@lucide/svelte/icons/phone';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Clock from '@lucide/svelte/icons/clock';
  import Globe from '@lucide/svelte/icons/globe';
  import Star from '@lucide/svelte/icons/star';

  let { data } = $props();

  let theme = $state(data.theme || {});
  let products = $derived(data.products || []);
  let saving = $state(false);
  let message = $state('');

  let selectedProducts = $state<string[]>(theme.featuredProductIds || []);

  function toggleProduct(id: string) {
    if (selectedProducts.includes(id)) {
      selectedProducts = selectedProducts.filter(p => p !== id);
    } else if (selectedProducts.length < 8) {
      selectedProducts = [...selectedProducts, id];
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    message = '';

    const formData = new FormData(e.target as HTMLFormElement);
    const raw = {
      themeName: formData.get('themeName') || undefined,
      heroHeadline: formData.get('heroHeadline') || undefined,
      heroSubtitle: formData.get('heroSubtitle') || undefined,
      heroButtonText: formData.get('heroButtonText') || undefined,
      heroImageUrl: formData.get('heroImageUrl') || undefined,
      storyText: formData.get('storyText') || undefined,
      featuredProductIds: selectedProducts.length > 0 ? selectedProducts : undefined,
      contactPhone: formData.get('contactPhone') || undefined,
      contactAddress: formData.get('contactAddress') || undefined,
      contactHours: formData.get('contactHours') || undefined,
      googleMapsUrl: formData.get('googleMapsUrl') || undefined,
    };

    const body = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined)
    );

    try {
      await apiFetch('/merchant/theme', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      message = 'Theme settings saved successfully!';
      await invalidateAll();
    } catch (err: unknown) {
      const error = err as { message?: string };
      message = error.message || 'Failed to save theme settings';
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-8 max-w-2xl">
  <div>
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <LayoutTemplate class="w-5 h-5" />
      Theme Settings
    </h2>
    <p class="text-muted-foreground mt-1">Customize your storefront appearance</p>
  </div>

  {#if message}
    <div class="p-3 rounded-lg {message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
      {message}
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-8">
    <!-- Theme Selection -->
    <div class="space-y-3">
      <label class="text-sm font-medium">Theme</label>
      <select name="themeName" class="w-full px-3 py-2 border rounded-lg" bind:value={theme.themeName}>
        <option value="classic">Classic (Orange)</option>
        <option value="brio">Brio (Green/White)</option>
      </select>
    </div>

    <!-- Hero Section -->
    <div class="space-y-4 border rounded-lg p-4">
      <h3 class="font-medium flex items-center gap-2">
        <Image class="w-4 h-4" />
        Hero Section
      </h3>
      <div class="space-y-3">
        <div>
          <label class="text-sm">Headline</label>
          <input name="heroHeadline" type="text" class="w-full px-3 py-2 border rounded-lg" value={theme.heroHeadline || ''} placeholder="Welcome to our cafe" />
        </div>
        <div>
          <label class="text-sm">Subtitle</label>
          <input name="heroSubtitle" type="text" class="w-full px-3 py-2 border rounded-lg" value={theme.heroSubtitle || ''} placeholder="Fresh coffee, every day" />
        </div>
        <div>
          <label class="text-sm">Button Text</label>
          <input name="heroButtonText" type="text" class="w-full px-3 py-2 border rounded-lg" value={theme.heroButtonText || ''} placeholder="Explore Menu" />
        </div>
        <div>
          <label class="text-sm">Hero Image URL</label>
          <input name="heroImageUrl" type="url" class="w-full px-3 py-2 border rounded-lg" value={theme.heroImageUrl || ''} placeholder="https://..." />
        </div>
      </div>
    </div>

    <!-- Story Section -->
    <div class="space-y-3 border rounded-lg p-4">
      <h3 class="font-medium">Our Story</h3>
      <textarea name="storyText" rows="4" class="w-full px-3 py-2 border rounded-lg" placeholder="Tell your customers about your cafe...">{theme.storyText || ''}</textarea>
    </div>

    <!-- Featured Products -->
    <div class="space-y-3 border rounded-lg p-4">
      <h3 class="font-medium flex items-center gap-2">
        <Star class="w-4 h-4" />
        Featured Items ({selectedProducts.length}/8)
      </h3>
      {#if products.length === 0}
        <p class="text-muted-foreground text-sm">No products available. Add products first.</p>
      {:else}
        <div class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {#each products as product}
            <button
              type="button"
              onclick={() => toggleProduct(product.id)}
              class="p-2 border rounded-lg text-left text-sm transition-colors {selectedProducts.includes(product.id) ? 'border-orange-500 bg-orange-50' : 'hover:bg-muted/50'}"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">{product.images?.[0] ? '📷' : '🍽️'}</span>
                <span class="truncate">{product.titleEn || product.name}</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Contact Info -->
    <div class="space-y-4 border rounded-lg p-4">
      <h3 class="font-medium">Contact Information</h3>
      <div class="space-y-3">
        <div>
          <label class="text-sm flex items-center gap-1"><Phone class="w-3 h-3" /> Phone</label>
          <input name="contactPhone" type="text" class="w-full px-3 py-2 border rounded-lg" value={theme.contactPhone || ''} />
        </div>
        <div>
          <label class="text-sm flex items-center gap-1"><MapPin class="w-3 h-3" /> Address</label>
          <input name="contactAddress" type="text" class="w-full px-3 py-2 border rounded-lg" value={theme.contactAddress || ''} />
        </div>
        <div>
          <label class="text-sm flex items-center gap-1"><Clock class="w-3 h-3" /> Hours</label>
          <input name="contactHours" type="text" class="w-full px-3 py-2 border rounded-lg" value={theme.contactHours || ''} placeholder="7am - 11pm daily" />
        </div>
        <div>
          <label class="text-sm flex items-center gap-1"><Globe class="w-3 h-3" /> Google Maps URL</label>
          <input name="googleMapsUrl" type="url" class="w-full px-3 py-2 border rounded-lg" value={theme.googleMapsUrl || ''} />
        </div>
      </div>
    </div>

    <button
      type="submit"
      disabled={saving}
      class="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {saving ? 'Saving...' : 'Save Theme Settings'}
    </button>
  </form>
</div>
