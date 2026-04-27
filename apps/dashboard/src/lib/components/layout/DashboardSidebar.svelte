<script lang="ts">
	import { page } from '$app/state';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import PackageIcon from '@lucide/svelte/icons/package';
	import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Users from '@lucide/svelte/icons/users';
	import Ticket from '@lucide/svelte/icons/ticket';
	import Star from '@lucide/svelte/icons/star';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Settings from '@lucide/svelte/icons/settings';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import LogOut from '@lucide/svelte/icons/log-out';
	import X from '@lucide/svelte/icons/x';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';

	interface NavItem {
		label: string;
		href: string;
		icon: typeof LayoutDashboard;
		children?: NavItem[];
	}

	interface Props {
		user: {
			userId: string;
			storeId: string;
			role: string;
		};
		open?: boolean;
		onclose?: () => void;
	}

	let { user, open = $bindable(false), onclose }: Props = $props();

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ label: 'Products', href: '/dashboard/products', icon: PackageIcon },
		{ label: 'Categories', href: '/dashboard/categories', icon: Grid3x3 },
		{ label: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
		{ label: 'Customers', href: '/dashboard/customers', icon: Users },
		{ label: 'Coupons', href: '/dashboard/coupons', icon: Ticket },
		{ label: 'Reviews', href: '/dashboard/reviews', icon: Star },
		{ label: 'Modifiers', href: '/dashboard/modifiers', icon: SlidersHorizontal },
		{ label: 'Inventory', href: '/dashboard/inventory', icon: PackageIcon },
		{ label: 'Support', href: '/dashboard/support', icon: Ticket },
		{
			label: 'Settings',
			href: '/dashboard/settings',
			icon: Settings,
			children: [
				{ label: 'General', href: '/dashboard/settings/general', icon: Settings },
				{ label: 'Branding', href: '/dashboard/settings/branding', icon: Settings },
				{ label: 'Storefront', href: '/dashboard/settings/storefront', icon: Settings },
				{ label: 'Staff', href: '/dashboard/settings/staff', icon: Settings },
				{ label: 'Shipping', href: '/dashboard/settings/shipping', icon: Settings },
				{ label: 'Tax', href: '/dashboard/settings/tax', icon: Settings },
				{ label: 'Webhooks', href: '/dashboard/settings/webhooks', icon: Settings },
				{ label: 'Currency', href: '/dashboard/settings/currency', icon: Settings },
			],
		},
	];

	let settingsExpanded = $state(false);

	function isActive(href: string): boolean {
		const current = page.url.pathname;
		if (href === '/dashboard') return current === '/dashboard';
		return current.startsWith(href);
	}

	function getInitials(): string {
		return 'U';
	}

	function handleLogout() {
		// Submit a logout form to clear cookies server-side
		document.querySelector<HTMLFormElement>('#logout-form')?.requestSubmit();
	}
</script>

<!-- Mobile overlay -->
{#if open}
	<div
		class="fixed inset-0 bg-black/50 z-40 lg:hidden"
		role="presentation"
		onclick={() => {
			open = false;
			onclose?.();
		}}
	></div>
{/if}

<aside
	class="fixed lg:static inset-y-0 left-0 z-50
		w-64 bg-sidebar text-sidebar-foreground flex flex-col
		transform transition-transform duration-200 ease-in-out
		{open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
>
	<!-- Brand -->
	<div class="h-16 flex items-center px-6">
		<a href="/dashboard" class="flex items-center gap-2 text-lg font-bold text-white">
			<svg class="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
				<line x1="3" y1="6" x2="21" y2="6" />
				<path d="M16 10a4 4 0 01-8 0" />
			</svg>
			StoreDash
		</a>
		<!-- Mobile close button -->
		<button
			class="ml-auto lg:hidden p-1 rounded hover:bg-sidebar-hover"
			onclick={() => {
				open = false;
				onclose?.();
			}}
			aria-label="Close sidebar"
		>
			<X class="w-5 h-5" />
		</button>
	</div>

	<Separator class="bg-white/10" />

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
		{#each navItems as item}
			{#if item.children}
				<!-- Settings with expandable sub-items -->
				<button
					class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
						{isActive(item.href) ? 'bg-sidebar-active/10 text-sidebar-active' : 'text-sidebar-foreground hover:bg-sidebar-hover'}"
					onclick={() => (settingsExpanded = !settingsExpanded)}
				>
					<svelte:component this={item.icon} class="w-5 h-5 shrink-0" />
					<span class="flex-1 text-left">{item.label}</span>
					<ChevronRight
						class="w-4 h-4 transition-transform {settingsExpanded ? 'rotate-90' : ''}"
					/>
				</button>
				{#if settingsExpanded}
					<div class="ml-8 space-y-1">
						{#each item.children as child}
							<a
								href={child.href}
								class="block px-3 py-2 rounded-lg text-sm
									{isActive(child.href) ? 'bg-sidebar-active/10 text-sidebar-active' : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'}"
							>
								{child.label}
							</a>
						{/each}
					</div>
				{/if}
			{:else}
				<a
					href={item.href}
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
						{isActive(item.href) ? 'bg-sidebar-active/10 text-sidebar-active font-medium' : 'text-sidebar-foreground hover:bg-sidebar-hover'}"
				>
					<svelte:component this={item.icon} class="w-5 h-5 shrink-0" />
					<span>{item.label}</span>
				</a>
			{/if}
		{/each}
	</nav>

	<!-- User section -->
	<Separator class="bg-white/10" />
	<div class="p-4 flex items-center gap-3">
		<Avatar class="h-9 w-9">
			<AvatarFallback class="bg-primary text-primary-foreground text-sm font-medium">
				{getInitials()}
			</AvatarFallback>
		</Avatar>
		<div class="flex-1 min-w-0">
			<p class="text-sm font-medium truncate">User</p>
			<p class="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
		</div>
		<form id="logout-form" method="POST" action="/logout" class="hidden"></form>
		<button
			onclick={handleLogout}
			class="p-1.5 rounded hover:bg-sidebar-hover text-sidebar-foreground/60 hover:text-sidebar-foreground"
			aria-label="Sign out"
		>
			<LogOut class="w-4 h-4" />
		</button>
	</div>
</aside>