<script lang="ts">
  import '../app.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<div class="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
  <Navbar />
  <main class="relative z-10 flex-1">
    <slot />
  </main>
  <Footer />
</div>
