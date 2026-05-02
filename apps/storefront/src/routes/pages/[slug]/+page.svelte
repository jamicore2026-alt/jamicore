<script lang="ts">
  import type { PageData } from './$types.js';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.page.metaTitle || data.page.title} | {data.store?.name ?? 'Store'}</title>
  <meta name="description" content={data.page.metaDescription || ''} />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
  <article class="prose prose-invert max-w-none">
    <h1 class="text-3xl font-bold text-[var(--color-text)] mb-6">{data.page.title}</h1>
    <div class="text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
      {data.page.content}
    </div>
  </article>
</div>
