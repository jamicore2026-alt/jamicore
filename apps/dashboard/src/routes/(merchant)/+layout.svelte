<script lang="ts">
	import DashboardSidebar from '$lib/components/layout/DashboardSidebar.svelte';
	import DashboardTopbar from '$lib/components/layout/DashboardTopbar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { data, children } = $props();

	let sidebarOpen = $state(false);
</script>

<div class="flex h-screen overflow-hidden">
	<DashboardSidebar user={data.user} bind:open={sidebarOpen} />
	<div class="flex-1 flex flex-col overflow-hidden">
		<DashboardTopbar user={data.user} billing={data.billing} onmenuclick={() => (sidebarOpen = true)} />
		<main class="flex-1 overflow-y-auto p-6 bg-background">
			{@render children()}
		</main>
	</div>
	<Toaster />
</div>