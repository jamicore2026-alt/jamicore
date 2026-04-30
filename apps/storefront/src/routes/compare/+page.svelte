<script lang="ts">
  import { onMount } from 'svelte';

  type CompareProduct = {
    image: string;
    title: string;
    price: string;
  };

  let comparedProducts = $state<CompareProduct[]>([]);

  onMount(() => {
    const stored = localStorage.getItem('compare_products');
    if (stored) comparedProducts = JSON.parse(stored);
  });
</script>

<div class="max-w-6xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">Compare Products</h1>
  {#if comparedProducts.length === 0}
    <p>No products to compare. Add products from the product listing.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each comparedProducts as product}
        <div class="border p-4 rounded">
          <img src={product.image} alt={product.title} class="w-full h-48 object-cover" />
          <h3 class="font-bold mt-2">{product.title}</h3>
          <p class="text-lg font-bold">{product.price}</p>
        </div>
      {/each}
    </div>
  {/if}
</div>
