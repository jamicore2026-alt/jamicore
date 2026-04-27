<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import Bell from '@lucide/svelte/icons/bell';
	import { apiFetch } from '$lib/api/client';

	let unreadCount = $state(0);
	let eventSource: EventSource | null = null;
	let connected = $state(false);

	onMount(() => {
		eventSource = new EventSource('/api/v1/merchant/notifications', { withCredentials: true });
		eventSource.onmessage = (e) => {
			try {
				const data = JSON.parse(e.data);
				if (data.type === 'connected') {
					unreadCount = data.unreadCount ?? 0;
					connected = true;
				} else {
					unreadCount++;
				}
			} catch { /* ignore parse errors */ }
		};
		eventSource.onerror = () => {
			// Close on error to prevent retry loops (e.g. 401 unauthenticated)
			eventSource?.close();
			eventSource = null;
			connected = false;
		};
		apiFetch('/merchant/notifications/list')
			.then((res: any) => { unreadCount = res?.unreadCount ?? 0; })
			.catch((err: any) => {
				// Silently ignore auth errors; redirect will be handled by layout server on next navigation
				if (err?.code !== 'INVALID_CREDENTIALS' && err?.error !== 'Unauthorized') {
					console.warn('Notification list error:', err);
				}
			});
	});

	onDestroy(() => {
		eventSource?.close();
	});

	async function markAllRead() {
		try {
			await apiFetch('/merchant/notifications/read-all', { method: 'POST' });
			unreadCount = 0;
		} catch { /* ignore */ }
	}
</script>

<div class="relative">
	<Button variant="ghost" size="icon" class="relative" onclick={markAllRead}>
		<Bell class="w-5 h-5" />
		{#if unreadCount > 0}
			<span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</Button>
</div>
