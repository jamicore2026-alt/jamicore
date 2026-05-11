<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '$lib/components/ui/dropdown-menu';
	import Bell from '@lucide/svelte/icons/bell';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import { apiFetch, refreshTokenForPath } from '$lib/api/client';

	interface NotificationItem {
		id: string;
		type: string;
		title: string;
		body: string;
		isRead: boolean;
		createdAt: string;
	}

	let unreadCount = $state(0);
	let notifications = $state<NotificationItem[]>([]);
	let eventSource: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	let isOpen = $state(false);
	let loading = $state(false);

	const MAX_RECONNECT_DELAY = 30000;

	function connectSSE() {
		if (eventSource) {
			eventSource.close();
		}

		eventSource = new EventSource('/api/v1/merchant/notifications', { withCredentials: true });

		eventSource.onopen = () => {
			reconnectAttempts = 0;
		};

		eventSource.onmessage = (e) => {
			try {
				const data = JSON.parse(e.data);
				if (data.type === 'connected') {
					unreadCount = data.unreadCount ?? 0;
				} else {
					unreadCount++;
					// Prepend new notification if dropdown is open
					if (data.title && data.body) {
						notifications = [
							{
								id: crypto.randomUUID?.() ?? String(Date.now()),
								type: data.type ?? 'info',
								title: data.title,
								body: data.body,
								isRead: false,
								createdAt: data.createdAt ?? new Date().toISOString(),
							},
							...notifications,
						];
					}
				}
			} catch {
				/* ignore parse errors */
			}
		};

		eventSource.onerror = async () => {
			// Connection lost — try token refresh first, then reconnect with backoff
			eventSource?.close();
			eventSource = null;

			const refreshed = await refreshTokenForPath('/merchant/notifications');
			if (refreshed) {
				reconnectAttempts = 0;
				connectSSE();
				return;
			}

			const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
			reconnectAttempts++;
			if (reconnectAttempts > 5) {
				window.location.href = '/login';
				return;
			}
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				connectSSE();
			}, delay);
		};
	}

	async function fetchNotifications() {
		loading = true;
		try {
			const res = await apiFetch<{ data: { notifications: NotificationItem[]; unreadCount: number } }>(
				'/merchant/notifications/list',
			);
			notifications = res?.data?.notifications ?? [];
			unreadCount = res?.data?.unreadCount ?? 0;
		} catch (err: any) {
			if (err?.code !== 'INVALID_CREDENTIALS' && err?.error !== 'Unauthorized') {
				console.warn('Notification list error:', err);
			}
		} finally {
			loading = false;
		}
	}

	async function markRead(id: string) {
		try {
			await apiFetch(`/merchant/notifications/${id}/read`, { method: 'PATCH' });
			notifications = notifications.map((n) =>
				n.id === id ? { ...n, isRead: true } : n,
			);
			unreadCount = Math.max(0, unreadCount - 1);
		} catch {
			/* ignore */
		}
	}

	async function markAllRead() {
		try {
			await apiFetch('/merchant/notifications/read-all', { method: 'POST' });
			notifications = notifications.map((n) => ({ ...n, isRead: true }));
			unreadCount = 0;
		} catch (err) {
			console.error('Failed to mark notifications as read', err);
		}
	}

	function formatDate(d: string) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	onMount(() => {
		connectSSE();
		fetchNotifications();
	});

	onDestroy(() => {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		eventSource?.close();
	});
</script>

<DropdownMenu bind:open={isOpen}>
	<DropdownMenuTrigger
		class="relative p-2 rounded-lg hover:bg-accent transition-colors outline-none group"
		onclick={() => {
			if (!isOpen) fetchNotifications();
		}}
	>
		<Bell class="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
		{#if unreadCount > 0}
			<span
				class="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground"
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</DropdownMenuTrigger>

	<DropdownMenuContent align="end" class="w-80 p-0">
		<div class="flex items-center justify-between px-4 py-3 border-b">
			<span class="text-sm font-semibold">Notifications</span>
			{#if unreadCount > 0}
				<Button variant="ghost" size="sm" class="h-auto py-1 px-2 text-xs hover:bg-primary/10 hover:text-primary" onclick={markAllRead}>
					<CheckCheck class="w-3 h-3 mr-1" /> Mark all read
				</Button>
			{/if}
		</div>

		<div class="max-h-80 overflow-y-auto">
			{#if loading}
				<p class="text-sm text-muted-foreground text-center py-8 text-xs">Loading...</p>
			{:else if notifications.length === 0}
				<div class="flex flex-col items-center justify-center py-10 text-center">
					<Bell class="w-8 h-8 text-muted-foreground/30 mb-2" />
					<p class="text-sm text-muted-foreground">No notifications</p>
				</div>
			{:else}
				{#each notifications as notif}
					<button
						class="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-0 {notif.isRead ? 'opacity-50' : ''}"
						onclick={() => {
							if (!notif.isRead) markRead(notif.id);
						}}
					>
						<div class="flex items-start gap-3">
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium truncate">{notif.title}</p>
								<p class="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
								<p class="text-[10px] text-muted-foreground/50 mt-1">{formatDate(notif.createdAt)}</p>
							</div>
							{#if !notif.isRead}
								<span class="h-2 w-2 rounded-full bg-primary shrink-0 mt-1"></span>
							{/if}
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</DropdownMenuContent>
</DropdownMenu>
