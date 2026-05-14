<script lang="ts">
  interface Props {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    isVegetarian?: boolean;
    storeSlug?: string;
  }

  let { id, name, description = '', price, image = '', isVegetarian = false, storeSlug = '' }: Props = $props();

  const href = $derived(storeSlug ? `/store/${storeSlug}/brio/product/${id}` : `/menu/${id}`);
</script>

<div
  class="bg-white border overflow-hidden transition-all hover:shadow-lg"
  style="border-color: #e5e5e5; border-radius: 4px;"
>
  <a href={href} class="block relative aspect-video" style="background-color: #f5f5f5;">
    {#if image}
      <img src={image} alt={name} class="w-full h-full object-cover" />
    {:else}
      <div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
    {/if}
    {#if isVegetarian}
      <span
        class="absolute top-2 left-2 text-xs px-2 py-0.5 font-medium"
        style="background-color: #e8f5e9; color: #1a4d2e; border-radius: 4px;"
      >
        Veg
      </span>
    {/if}
  </a>

  <div class="p-4">
    <a href={href}>
      <h3 class="font-semibold text-base mb-1 hover:text-[#1a4d2e] transition-colors" style="color: #1a1a1a;">{name}</h3>
    </a>
    {#if description}
      <p class="text-sm line-clamp-2 mb-3" style="color: #666666;">{description}</p>
    {/if}
    <div class="flex items-center justify-between">
      <span class="font-bold text-lg" style="color: #1a1a1a;">${price.toFixed(2)}</span>
      <a
        href={href}
        class="inline-block px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        style="background-color: #1a4d2e; border-radius: 4px;"
      >
        View
      </a>
    </div>
  </div>
</div>
