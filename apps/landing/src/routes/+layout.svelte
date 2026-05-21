<script lang="ts">
  import '../app.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
  <Navbar />
  <main class="flex-1">
    <slot />
  </main>
  <Footer />
</div>
