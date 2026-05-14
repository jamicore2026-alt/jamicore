<script lang="ts">
  interface Props {
    story?: string;
  }

  let { story = '' }: Props = $props();
</script>

<section class="py-16 px-4" style="background-color: #ffffff;">
  <div class="max-w-3xl mx-auto text-center">
    <h2 class="text-2xl md:text-3xl font-bold mb-6" style="color: #1a1a1a;">Our Story</h2>
    {#if story}
      <p class="text-base leading-relaxed" style="color: #666666;">{story}</p>
    {:else}
      <p class="text-base leading-relaxed" style="color: #666666;">
        Welcome to our kitchen. We believe in honest food made with passion and the freshest ingredients. Every dish tells a story of tradition, care, and a love for great flavor.
      </p>
    {/if}
  </div>
</section>
