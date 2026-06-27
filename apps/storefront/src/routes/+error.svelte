<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="flex min-h-[60vh] items-center justify-center px-4 py-16">
  <div class="max-w-md text-center">
    <p class="text-5xl font-bold text-[var(--color-primary)]">{page.status}</p>
    <h1 class="mt-4 text-xl font-semibold text-[var(--color-text)]">
      {page.error?.message || 'Something went wrong'}
    </h1>
    <p class="mt-2 text-sm text-[var(--color-text-secondary)]">
      The page you were looking for could not be loaded.
    </p>
    <div class="mt-6 flex items-center justify-center gap-3">
      <a
        href="/"
        class="rounded-[var(--radius-base)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Back to home
      </a>
      {#if page.status === 404}
        <button
          type="button"
          class="rounded-[var(--radius-base)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
          onclick={() => history.back()}
        >
          Go back
        </button>
      {/if}
    </div>
  </div>
</div>