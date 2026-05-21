<script lang="ts">
  import '../app.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<div class="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
  <!-- Ambient gradient orbs -->
  <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <div
      class="absolute -left-[20%] -top-[20%] h-[600px] w-[600px] rounded-full opacity-20 blur-[120px]"
      style="background: radial-gradient(circle, #d97706 0%, transparent 70%);"
    ></div>
    <div
      class="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full opacity-15 blur-[100px]"
      style="background: radial-gradient(circle, #7c3aed 0%, transparent 70%);"
    ></div>
    <div
      class="absolute left-[40%] top-[30%] h-[300px] w-[300px] rounded-full opacity-10 blur-[80px]"
      style="background: radial-gradient(circle, #06b6d4 0%, transparent 70%);"
    ></div>
  </div>

  <!-- Subtle grid overlay -->
  <div
    class="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
    style="background-image: linear-gradient(rgba(217,119,6,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,6,0.3) 1px, transparent 1px); background-size: 60px 60px;"
  ></div>

  <Navbar />
  <main class="relative z-10 flex-1">
    <slot />
  </main>
  <Footer />
</div>
