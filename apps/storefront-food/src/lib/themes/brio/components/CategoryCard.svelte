<script lang="ts">
  interface Props {
    name: string;
    image?: string;
    productCount: number;
    storeSlug?: string;
    slug?: string;
    icon?: string;
  }

  let { name, image = '', productCount, storeSlug = '', slug = '', icon = '' }: Props = $props();

  const href = $derived(storeSlug && slug ? `/store/${storeSlug}/brio/menu/${slug}` : `/menu/${slug}`);
</script>

<a
  href={href}
  class="block bg-white border transition-all hover:shadow-lg"
  style="border-color: #e5e5e5; border-radius: 4px;"
>
  <div class="aspect-[4/3] overflow-hidden" style="background-color: #f5f5f5;">
    {#if image}
      <img src={image} alt={name} class="w-full h-full object-cover" />
    {:else if icon}
      <div class="w-full h-full flex items-center justify-center text-4xl">{icon}</div>
    {:else}
      <div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
    {/if}
  </div>
  <div class="p-4">
    <h3 class="font-semibold text-base mb-1" style="color: #1a1a1a;">{name}</h3>
    <p class="text-sm" style="color: #666666;">
      {productCount} {productCount === 1 ? 'item' : 'items'}
    </p>
  </div>
</a>
