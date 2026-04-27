<script lang="ts">
	import { page } from '$app/state';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import FileText from '@lucide/svelte/icons/file-text';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Headphones from '@lucide/svelte/icons/headphones';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Globe from '@lucide/svelte/icons/globe';
	import Settings from '@lucide/svelte/icons/settings';
	import LogOut from '@lucide/svelte/icons/log-out';
	import X from '@lucide/svelte/icons/x';
	import Shield from '@lucide/svelte/icons/shield';
	import Users from '@lucide/svelte/icons/users';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';

	interface NavItem {
		label: string;
		href: string;
		icon: typeof LayoutDashboard;
	}

	interface Props {
		user: {
			superAdminId: string;
			role: string;
		};
		open?: boolean;
		onclose?: () => void;
	}

	let { user, open = $bindable(false), onclose }: Props = $props();

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
		{ label: 'Merchants', href: '/admin/merchants', icon: Building2 },
		{ label: 'Subscriptions', href: '/admin/plans', icon: CreditCard },
		{ label: 'Invoices', href: '/admin/invoices', icon: FileText },
		{ label: 'Revenue', href: '/admin/revenue', icon: BarChart3 },
		{ label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
		{ label: 'Support', href: '/admin/support', icon: Headphones },
		{ label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
		{ label: 'Security', href: '/admin/security', icon: ShieldCheck },
		{ label: 'Staff', href: '/admin/staff', icon: Users },
		{ label: 'Domains', href: '/admin/domains', icon: Globe },
		{ label: 'Settings', href: '/admin/settings', icon: Settings },
	];

	function isActive(href: string): boolean {
		const current = page.url.pathname;
		if (href === '/admin') return current === '/admin';
		return current.startsWith(href);
	}

	function getInitials(): string {
		return 'A';
	}

	function handleLogout() {
		document.querySelector<HTMLFormElement>('#admin-logout-form')?.requestSubmit();
	}

	function activeClasses(href: string): string {
		return isActive(href)
			? 'bg-primary/10 shadow-[0_0_20px_rgba(6,182,212,0.1)] border border-primary/20 text-primary font-semibold'
			: 'text-muted-foreground hover:text-foreground hover:bg-white/5';
	}

	function iconClasses(href: string): string {
		return isActive(href) ? 'text-primary' : 'text-muted-foreground';
	}
</script>

<!-- Mobile overlay -->
{#if open}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
		role="presentation"
		onclick={() => {
			open = false;
			onclose?.();
		}}
	></div>
{/if}

<aside
	class="fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
		w-56 bg-[rgba(8,13,24,0.85)] backdrop-blur-xl
		border-r border-[rgba(30,58,95,0.3)]
		flex flex-col shrink-0 overflow-hidden
		transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
		{open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
	style="box-shadow: 4px 0 24px rgba(0,0,0,0.3);"
>
	<!-- Brand -->
	<div class="h-16 flex items-center px-4 border-b border-[rgba(30,58,95,0.25)]">
		<div class="flex items-center gap-3 min-w-0">
			<div class="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shrink-0 ring-1 ring-primary/20"
				style="box-shadow: 0 0 20px rgba(6,182,212,0.15);"
			>
				<Shield class="w-5 h-5 text-primary" />
			</div>
			<span class="text-[15px] font-bold text-foreground tracking-tight whitespace-nowrap">
				Platform
			</span>
		</div>
		<!-- Mobile close button -->
		<button
			class="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-white/5 transition-colors"
			onclick={() => {
				open = false;
				onclose?.();
			}}
			aria-label="Close sidebar"
		>
			<X class="w-4 h-4 text-muted-foreground" />
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
		{#each navItems as item}
			{@const Icon = item.icon}
			<a
				href={item.href}
				class="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative overflow-hidden {activeClasses(item.href)}"
			>
				{#if isActive(item.href)}
					<span class="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-100"></span>
					<span class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full"
						style="box-shadow: 0 0 12px rgba(6,182,212,0.5);"
					></span>
				{/if}
				<Icon
					class="w-[18px] h-[18px] shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-110 {iconClasses(item.href)}"
				/>
				<span class="relative z-10 whitespace-nowrap">
					{item.label}
				</span>
				{#if isActive(item.href)}
					<span class="ml-auto h-1.5 w-1.5 rounded-full bg-primary relative z-10"
						style="box-shadow: 0 0 8px rgba(6,182,212,0.6);"
					></span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- User section -->
	<div class="border-t border-[rgba(30,58,95,0.25)] p-3">
		<div class="flex items-center gap-3">
			<Avatar class="h-8 w-8 shrink-0">
				<AvatarFallback class="bg-primary/15 text-primary text-xs font-bold font-mono ring-1 ring-primary/20"
					style="box-shadow: 0 0 12px rgba(6,182,212,0.1);"
				>
					{getInitials()}
				</AvatarFallback>
			</Avatar>
			<div class="flex-1 min-w-0">
				<p class="text-sm font-semibold truncate font-heading">Admin</p>
				<div class="flex items-center gap-1.5">
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"
						style="box-shadow: 0 0 6px rgba(16,185,129,0.5);"
					></span>
					<p class="text-[11px] text-muted-foreground capitalize font-mono">{user.role}</p>
				</div>
			</div>
			<form id="admin-logout-form" method="POST" action="/admin/logout" class="hidden"></form>
			<button
				onclick={handleLogout}
				class="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
				aria-label="Sign out"
			>
				<LogOut class="w-4 h-4" />
			</button>
		</div>
	</div>
</aside>
