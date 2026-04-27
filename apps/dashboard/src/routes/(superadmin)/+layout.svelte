<script lang="ts">
	import AdminSidebar from '$lib/components/layout/AdminSidebar.svelte';
	import AdminTopbar from '$lib/components/layout/AdminTopbar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { data, children } = $props();

	let sidebarOpen = $state(false);
</script>

<div class="flex h-screen overflow-hidden bg-background relative">
	<!-- Grid background -->
	<div class="absolute inset-0 bg-grid pointer-events-none z-0"></div>
	<!-- Subtle radial glow -->
	<div class="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px] pointer-events-none z-0"></div>
	<div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/2 rounded-full blur-[100px] pointer-events-none z-0"></div>

	<AdminSidebar user={data.user} bind:open={sidebarOpen} />
	<div class="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
		<AdminTopbar user={data.user} onmenuclick={() => (sidebarOpen = true)} />
		<main class="flex-1 overflow-y-auto p-5 sm:p-8">
			{@render children()}
		</main>
	</div>
	<Toaster />
</div>
