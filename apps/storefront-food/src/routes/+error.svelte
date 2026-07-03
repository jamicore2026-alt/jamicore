<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="flex min-h-[60vh] items-center justify-center px-4 py-16">
  <div class="max-w-md text-center">
    <p class="text-5xl font-bold text-orange-600">{page.status}</p>
    <h1 class="mt-4 text-xl font-semibold text-neutral-900">
      {page.error?.message || 'Something went wrong'}
    </h1>
    <p class="mt-2 text-sm text-neutral-500">
      The page you were looking for could not be loaded.
    </p>
    <div class="mt-6 flex items-center justify-center gap-3">
      <a
        href="/"
        class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
      >
        Back to home
      </a>
      {#if page.status === 404}
        <button
          type="button"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100"
          onclick={() => history.back()}
        >
          Go back
        </button>
      {/if}
    </div>
  </div>
</div>