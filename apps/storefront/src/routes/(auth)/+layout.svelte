<script lang="ts">
	let { children } = $props();
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		{@render children()}
	</div>
</div>
