<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="flex min-h-screen items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold">{page.status}</h1>
    <p class="mt-2 text-lg text-gray-600">{page.error?.message || 'Something went wrong'}</p>
    <a href="/dashboard" class="mt-4 inline-block text-blue-600 hover:underline">Go to Dashboard</a>
  </div>
</div>
