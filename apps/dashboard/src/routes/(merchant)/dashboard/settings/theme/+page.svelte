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
  import Palette from '@lucide/svelte/icons/palette';
  import Type from '@lucide/svelte/icons/type';
  import Box from '@lucide/svelte/icons/box';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';

  let { data } = $props();

  let theme = $state(data.theme || {});
  let products = $derived(data.products || []);
  let saving = $state(false);
  let message = $state('');

  let selectedProducts = $state<string[]>(theme.featuredProductIds || []);

  // Customization state
  const defaultCustomization = {
    primaryColor: '#1a4d2e',
    primaryLight: '#e8f5e9',
    textColor: '#1a1a1a',
    textMuted: '#666666',
    bgColor: '#ffffff',
    cardBg: '#ffffff',
    borderColor: '#e5e5e5',
    footerBg: '#1a4d2e',
    footerText: '#ffffff',
    fontFamily: 'inter',
    borderRadius: 'sm',
    buttonStyle: 'filled',
    cardShadow: 'sm',
    headerStyle: 'light',
    heroOverlay: 'none',
    spacing: 'normal',
  };

  let customization = $state({
    ...defaultCustomization,
    ...(theme.customization || {}),
  });

  function toggleProduct(id: string) {
    if (selectedProducts.includes(id)) {
      selectedProducts = selectedProducts.filter(p => p !== id);
    } else if (selectedProducts.length < 8) {
      selectedProducts = [...selectedProducts, id];
    }
  }

  function resetCustomization() {
    customization = { ...defaultCustomization };
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
      customization: Object.keys(customization).length > 0 ? customization : undefined,
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

  const radiusMap: Record<string, string> = { none: '0px', sm: '4px', md: '8px', lg: '16px', xl: '24px' };
  const shadowMap: Record<string, string> = { none: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)' };

  const previewStyle = $derived(`
    --primary: ${customization.primaryColor};
    --primary-light: ${customization.primaryLight};
    --text: ${customization.textColor};
    --muted: ${customization.textMuted};
    --bg: ${customization.bgColor};
    --card-bg: ${customization.cardBg};
    --border: ${customization.borderColor};
    --footer-bg: ${customization.footerBg};
    --footer-text: ${customization.footerText};
    --radius: ${radiusMap[customization.borderRadius]};
    --shadow: ${shadowMap[customization.cardShadow]};
    --font: ${customization.fontFamily === 'inter' ? 'Inter, sans-serif' : customization.fontFamily === 'playfair' ? 'Playfair Display, serif' : customization.fontFamily === 'roboto' ? 'Roboto, sans-serif' : 'Poppins, sans-serif'};
  `);
</script>

<div class="space-y-8 max-w-3xl">
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

  <form onsubmit={handleSubmit} class="space-y-10">
    <!-- Theme Selection -->
    <div class="space-y-3">
      <label class="text-sm font-medium">Theme</label>
      <select name="themeName" class="w-full px-3 py-2 border rounded-lg bg-white" bind:value={theme.themeName}>
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

    <!-- Appearance / Design Tokens -->
    <div class="space-y-4 border rounded-lg p-4">
      <div class="flex items-center justify-between">
        <h3 class="font-medium flex items-center gap-2">
          <Palette class="w-4 h-4" />
          Appearance
        </h3>
        <button
          type="button"
          onclick={resetCustomization}
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      <!-- Preview Box -->
      <div class="rounded-lg p-4 border" style={previewStyle}>
        <div class="text-sm font-medium mb-2" style="color: var(--primary);">Live Preview</div>
        <div class="rounded p-3 space-y-2" style="background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); font-family: var(--font);">
          <h4 class="font-bold" style="color: var(--text);">Sample Card</h4>
          <p class="text-sm" style="color: var(--muted);">This is how your cards will look.</p>
          <button class="px-3 py-1.5 text-xs font-medium text-white rounded" style="background: var(--primary); border-radius: var(--radius);">Button</button>
        </div>
      </div>

      <!-- Colors -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Primary Color</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.primaryColor} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.primaryColor} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Primary Light</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.primaryLight} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.primaryLight} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Text Color</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.textColor} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.textColor} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Muted Text</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.textMuted} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.textMuted} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Background</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.bgColor} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.bgColor} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Card Background</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.cardBg} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.cardBg} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Border Color</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.borderColor} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.borderColor} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Footer Background</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.footerBg} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.footerBg} />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium">Footer Text</label>
          <div class="flex items-center gap-2 mt-1">
            <input type="color" class="w-8 h-8 rounded cursor-pointer border" bind:value={customization.footerText} />
            <input type="text" class="flex-1 px-2 py-1 text-sm border rounded" bind:value={customization.footerText} />
          </div>
        </div>
      </div>

      <!-- Typography & Layout -->
      <div class="grid grid-cols-2 gap-3 pt-2">
        <div>
          <label class="text-xs font-medium flex items-center gap-1"><Type class="w-3 h-3" /> Font Family</label>
          <select class="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white" bind:value={customization.fontFamily}>
            <option value="inter">Inter (Modern)</option>
            <option value="playfair">Playfair Display (Elegant)</option>
            <option value="roboto">Roboto (Clean)</option>
            <option value="poppins">Poppins (Friendly)</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium flex items-center gap-1"><Box class="w-3 h-3" /> Border Radius</label>
          <select class="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white" bind:value={customization.borderRadius}>
            <option value="none">None (0px)</option>
            <option value="sm">Small (4px)</option>
            <option value="md">Medium (8px)</option>
            <option value="lg">Large (16px)</option>
            <option value="xl">Extra Large (24px)</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium">Button Style</label>
          <select class="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white" bind:value={customization.buttonStyle}>
            <option value="filled">Filled</option>
            <option value="outline">Outline</option>
            <option value="rounded">Rounded Pill</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium">Card Shadow</label>
          <select class="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white" bind:value={customization.cardShadow}>
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium flex items-center gap-1"><Sun class="w-3 h-3" /> Header Style</label>
          <select class="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white" bind:value={customization.headerStyle}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium flex items-center gap-1"><Moon class="w-3 h-3" /> Hero Overlay</label>
          <select class="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white" bind:value={customization.heroOverlay}>
            <option value="none">None</option>
            <option value="light">Light Overlay</option>
            <option value="dark">Dark Overlay</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium">Section Spacing</label>
          <select class="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white" bind:value={customization.spacing}>
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
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
