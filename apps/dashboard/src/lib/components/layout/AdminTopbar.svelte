<script lang="ts">
	import { page } from '$app/state';
	import Menu from '@lucide/svelte/icons/menu';
	import LogOut from '@lucide/svelte/icons/log-out';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Bell from '@lucide/svelte/icons/bell';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	interface Props {
		user: {
			superAdminId: string;
			role: string;
		};
		onmenuclick?: () => void;
	}

	let { user, onmenuclick }: Props = $props();

	let unreadCount = $state(0);
	let notifications = $state<any[]>([]);
	let notifOpen = $state(false);
	let loadingNotifs = $state(false);

	function getInitials(): string {
		return 'A';
	}

	async function fetchUnreadCount() {
		try {
			const res = await fetch('/api/v1/admin/notifications/count', { credentials: 'include' });
			if (res.ok) {
				const data = await res.json();
				unreadCount = data.count ?? 0;
			}
		} catch {
			// ignore
		}
	}

	async function fetchNotifications() {
		loadingNotifs = true;
		try {
			const res = await fetch('/api/v1/admin/notifications?limit=10', { credentials: 'include' });
			if (res.ok) {
				const data = await res.json();
				notifications = data.data || [];
				unreadCount = data.unread ?? 0;
			}
		} catch {
			notifications = [];
		} finally {
			loadingNotifs = false;
		}
	}

	async function markRead(id: string) {
		try {
			const res = await fetch(`/api/v1/admin/notifications/${id}/read`, {
				method: 'PATCH',
				credentials: 'include',
			});
			if (res.ok) {
				notifications = notifications.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
				unreadCount = Math.max(0, unreadCount - 1);
			}
		} catch {
			// ignore
		}
	}

	async function markAllRead() {
		try {
			const res = await fetch('/api/v1/admin/notifications/read-all', {
				method: 'PATCH',
				credentials: 'include',
			});
			if (res.ok) {
				notifications = notifications.map((n) => ({ ...n, readAt: new Date().toISOString() }));
				unreadCount = 0;
			}
		} catch {
			// ignore
		}
	}

	onMount(() => {
		fetchUnreadCount();
		const interval = setInterval(fetchUnreadCount, 30000);
		return () => clearInterval(interval);
	});

	function getPageTitle(): string {
		const pathname = page.url.pathname;
		if (pathname === '/admin') return 'Dashboard';
		if (pathname.startsWith('/admin/merchants/new')) return 'Add Merchant';
		if (pathname.startsWith('/admin/merchants/') && pathname.split('/').length > 3) return 'Merchant Details';
		if (pathname.startsWith('/admin/merchants')) return 'Merchants';
		if (pathname.startsWith('/admin/plans')) return 'Subscription Plans';
		if (pathname.startsWith('/admin/stores')) return 'All Stores';
		if (pathname.startsWith('/admin/revenue')) return 'Revenue';
		if (pathname.startsWith('/admin/orders')) return 'Orders';
		if (pathname.startsWith('/admin/support')) return 'Support';
		if (pathname.startsWith('/admin/audit-logs')) return 'Audit Logs';
		if (pathname.startsWith('/admin/security')) return 'Security';
		if (pathname.startsWith('/admin/staff')) return 'Staff Management';
		if (pathname.startsWith('/admin/domains')) return 'Custom Domains';
		if (pathname.startsWith('/admin/invoices')) return 'Invoices';
		if (pathname.startsWith('/admin/settings')) return 'Settings';
		return 'Platform Admin';
	}

	function getBreadcrumbs(): Array<{ label: string; href?: string }> {
		const pathname = page.url.pathname;
		const crumbs: Array<{ label: string; href?: string }> = [{ label: 'Dashboard', href: '/admin' }];

		if (pathname.startsWith('/admin/merchants')) {
			crumbs.push({ label: 'Merchants', href: '/admin/merchants' });
			if (pathname.endsWith('/new')) {
				crumbs.push({ label: 'Add Merchant' });
			} else if (pathname.split('/').length > 3) {
				crumbs.push({ label: 'Details' });
			}
		} else if (pathname.startsWith('/admin/plans')) {
			crumbs.push({ label: 'Plans' });
		} else if (pathname.startsWith('/admin/stores')) {
			crumbs.push({ label: 'Stores' });
		} else if (pathname.startsWith('/admin/revenue')) {
			crumbs.push({ label: 'Revenue' });
		} else if (pathname.startsWith('/admin/orders')) {
			crumbs.push({ label: 'Orders' });
		} else if (pathname.startsWith('/admin/support')) {
			crumbs.push({ label: 'Support' });
		} else if (pathname.startsWith('/admin/audit-logs')) {
			crumbs.push({ label: 'Audit Logs' });
		} else if (pathname.startsWith('/admin/security')) {
			crumbs.push({ label: 'Security' });
		} else if (pathname.startsWith('/admin/staff')) {
			crumbs.push({ label: 'Staff' });
		} else if (pathname.startsWith('/admin/domains')) {
			crumbs.push({ label: 'Domains' });
		} else if (pathname.startsWith('/admin/invoices')) {
			crumbs.push({ label: 'Invoices' });
		} else if (pathname.startsWith('/admin/settings')) {
			crumbs.push({ label: 'Settings' });
		}

		return crumbs;
	}

	function formatDate(d: string) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<header
	class="h-16 flex items-center px-4 lg:px-8 shrink-0 justify-between gap-4 z-20 relative
		bg-[rgba(6,11,20,0.6)] backdrop-blur-xl border-b border-[rgba(30,58,95,0.3)]"
	style="box-shadow: 0 4px 24px rgba(0,0,0,0.2);"
>
	<div class="flex items-center gap-3 min-w-0">
		<!-- Mobile hamburger -->
		<button
			class="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors mr-1"
			onclick={onmenuclick}
			aria-label="Open menu"
		>
			<Menu class="w-5 h-5 text-muted-foreground" />
		</button>

		<!-- Page title + breadcrumbs -->
		<div class="min-w-0">
			<h1 class="text-base font-bold tracking-tight font-heading truncate">{getPageTitle()}</h1>
			<nav class="hidden md:flex items-center text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
				{#each getBreadcrumbs() as crumb, i}
					{#if i > 0}
						<ChevronRight class="h-3 w-3 mx-1 shrink-0 text-[rgba(30,58,95,0.6)]" />
					{/if}
					{#if crumb.href}
						<a href={crumb.href} class="hover:text-primary transition-colors">{crumb.label}</a>
					{:else}
						<span class="text-foreground/80 font-medium">{crumb.label}</span>
					{/if}
				{/each}
			</nav>
		</div>
	</div>

	<!-- Right section -->
	<div class="flex items-center gap-2 sm:gap-3 shrink-0">
		<!-- Role badge -->
		<div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10">
			<span class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
			<span class="text-[11px] font-mono uppercase tracking-wider text-primary">{user.role}</span>
		</div>

		<!-- Notifications -->
		<DropdownMenu bind:open={notifOpen}>
			<DropdownMenuTrigger
				class="relative p-2 rounded-lg hover:bg-white/5 transition-colors outline-none group"
				onclick={() => { if (!notifOpen) fetchNotifications(); }}
			>
				<Bell class="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
				{#if unreadCount > 0}
					<span
						class="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"
						style="box-shadow: 0 0 8px rgba(6,182,212,0.8);"
					></span>
				{/if}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-80 p-0 bg-[rgba(10,16,28,0.95)] backdrop-blur-xl border-[rgba(30,58,95,0.4)]">
				<div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(30,58,95,0.3)]">
					<span class="text-sm font-semibold font-heading">Notifications</span>
					{#if unreadCount > 0}
						<Button variant="ghost" size="sm" class="h-auto py-1 px-2 text-xs hover:bg-primary/10 hover:text-primary" onclick={markAllRead}>
							<CheckCheck class="w-3 h-3 mr-1" /> Mark all read
						</Button>
					{/if}
				</div>
				<div class="max-h-80 overflow-y-auto">
					{#if loadingNotifs}
						<p class="text-sm text-muted-foreground text-center py-8 font-mono text-xs">Loading...</p>
					{:else if notifications.length === 0}
						<div class="flex flex-col items-center justify-center py-10 text-center">
							<Bell class="w-8 h-8 text-muted-foreground/30 mb-2" />
							<p class="text-sm text-muted-foreground">No notifications</p>
						</div>
					{:else}
						{#each notifications as notif}
							<button
								class="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-[rgba(30,58,95,0.15)] last:border-0 {notif.readAt ? 'opacity-50' : ''}"
								onclick={() => { if (!notif.readAt) markRead(notif.id); }}
							>
								<div class="flex items-start gap-3">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium truncate">{notif.title}</p>
										<p class="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
										<p class="text-[10px] text-muted-foreground/50 mt-1 font-mono">{formatDate(notif.createdAt)}</p>
									</div>
									{#if !notif.readAt}
										<span
											class="h-2 w-2 rounded-full bg-primary shrink-0 mt-1"
											style="box-shadow: 0 0 6px rgba(6,182,212,0.5);"
										></span>
									{/if}
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>

		<!-- User dropdown -->
		<DropdownMenu>
			<DropdownMenuTrigger class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors outline-none">
				<Avatar class="h-8 w-8 ring-1 ring-primary/20" style="box-shadow: 0 0 12px rgba(6,182,212,0.1);">
					<AvatarFallback class="bg-primary/15 text-primary text-xs font-bold font-mono">
						{getInitials()}
					</AvatarFallback>
				</Avatar>
				<span class="hidden sm:block text-sm font-medium font-heading">Admin</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-56 bg-[rgba(10,16,28,0.95)] backdrop-blur-xl border-[rgba(30,58,95,0.4)]">
				<DropdownMenuLabel>
					<div class="flex flex-col">
						<span class="text-sm font-semibold font-heading">Admin</span>
						<span class="text-xs text-muted-foreground capitalize font-mono">{user.role}</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator class="bg-[rgba(30,58,95,0.3)]" />
				<DropdownMenuItem
					class="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
					onSelect={() => {
						document.querySelector<HTMLFormElement>('#admin-logout-form')?.requestSubmit();
					}}
				>
					<LogOut class="w-4 h-4 mr-2" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
</header>
