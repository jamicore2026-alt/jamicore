<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import Bell from '@lucide/svelte/icons/bell';
	import BellDot from '@lucide/svelte/icons/bell-dot';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import Clock from '@lucide/svelte/icons/clock';

	interface Notification {
		id: string;
		type: string;
		title: string;
		body: string;
		isRead: boolean;
		createdAt: string;
	}

	let unreadCount = $state(0);
	let notifications = $state<Notification[]>([]);
	let open = $state(false);
	let eventSource: EventSource | null = null;
	let loading = $state(false);

	onMount(() => {
		eventSource = new EventSource('/api/v1/merchant/notifications', { withCredentials: true });
		eventSource.onmessage = (e) => {
			try {
				const data = JSON.parse(e.data);
				if (data.type === 'connected') {
					unreadCount = data.unreadCount ?? 0;
				} else {
					unreadCount++;
					notifications = [
						{ id: data.id ?? '', type: data.type, title: data.title, body: data.body, isRead: false, createdAt: data.createdAt ?? new Date().toISOString() },
						...notifications,
					];
				}
			} catch { /* ignore parse errors */ }
		};
		eventSource.onerror = () => {
			eventSource?.close();
			eventSource = null;
		};
		loadNotifications();
	});

	onDestroy(() => {
		eventSource?.close();
	});

	async function loadNotifications() {
		loading = true;
		try {
			const res = await apiFetch<{ notifications: Notification[]; unreadCount: number }>('/merchant/notifications/list');
			notifications = res.notifications ?? [];
			unreadCount = res.unreadCount ?? 0;
		} catch {
			/* ignore */
		} finally {
			loading = false;
		}
	}

	async function markOneRead(id: string) {
		try {
			await apiFetch(`/merchant/notifications/${id}/read`, { method: 'PATCH' });
			notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
			unreadCount = Math.max(0, unreadCount - 1);
		} catch { /* ignore */ }
	}

	async function markAllRead() {
		try {
			await apiFetch('/merchant/notifications/read-all', { method: 'POST' });
			notifications = notifications.map((n) => ({ ...n, isRead: true }));
			unreadCount = 0;
		} catch { /* ignore */ }
	}

	function toggleOpen() {
		open = !open;
		if (open && notifications.length === 0) {
			loadNotifications();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.notification-dropdown')) {
			open = false;
		}
	}

	function formatTime(d: string) {
		if (!d) return '';
		const date = new Date(d);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative notification-dropdown">
	<Button variant="ghost" size="icon" class="relative" onclick={toggleOpen}>
		{#if unreadCount > 0}
			<BellDot class="w-5 h-5" />
		{:else}
			<Bell class="w-5 h-5" />
		{/if}
		{#if unreadCount > 0}
			<span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</Button>

	{#if open}
		<div class="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
			<div class="flex items-center justify-between px-4 py-3 border-b">
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold">Notifications</span>
					{#if unreadCount > 0}
						<Badge variant="secondary" class="h-5 px-1.5 text-[10px]">{unreadCount}</Badge>
					{/if}
				</div>
				{#if notifications.length > 0}
					<Button variant="ghost" size="sm" class="h-7 text-xs gap-1" onclick={markAllRead}>
						<CheckCheck class="w-3 h-3" />
						Mark all read
					</Button>
				{/if}
			</div>

			<div class="max-h-[360px] overflow-y-auto">
				{#if loading && notifications.length === 0}
					<div class="py-8 text-center text-sm text-muted-foreground">Loading...</div>
				{:else if notifications.length === 0}
					<div class="py-8 text-center">
						<Bell class="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
						<p class="text-sm text-muted-foreground">No notifications yet</p>
					</div>
				{:else}
					{#each notifications as notification (notification.id)}
						<button
							class="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex gap-3 items-start {notification.isRead ? 'opacity-60' : ''}"
							onclick={() => markOneRead(notification.id)}
						>
							<div class="mt-0.5 w-2 h-2 rounded-full shrink-0 {notification.isRead ? 'bg-muted' : 'bg-primary'}" />
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium truncate">{notification.title}</p>
								<p class="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
								<p class="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
									<Clock class="w-3 h-3" />
									{formatTime(notification.createdAt)}
								</p>
							</div>
						</button>
						{#if notification !== notifications[notifications.length - 1]}
							<Separator />
						{/if}
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
