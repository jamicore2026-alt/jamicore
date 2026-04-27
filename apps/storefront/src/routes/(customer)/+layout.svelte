<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const navItems = [
		{ href: '/account', label: 'Account' },
		{ href: '/account/orders', label: 'Orders', matchPrefix: true },
		{ href: '/account/profile', label: 'Profile' },
		{ href: '/account/addresses', label: 'Addresses' },
		{ href: '/account/wishlist', label: 'Wishlist' },
		{ href: '/account/reviews', label: 'Reviews' },
	];

	function isActive(href: string, matchPrefix = false): boolean {
		const pathname = page.url.pathname;
		if (matchPrefix) return pathname.startsWith(href);
		return pathname === href;
	}
</script>

<div class="max-w-6xl mx-auto px-4 py-8">
	<!-- Account navigation tabs -->
	<nav class="flex items-center gap-1 mb-8 overflow-x-auto pb-2 border-b border-[var(--color-border)]">
		{#each navItems as item}
			<a
				href={item.href}
				class="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors whitespace-nowrap
					{isActive(item.href, item.matchPrefix)
						? 'bg-[var(--color-primary)] text-white'
						: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}"
			>
				{item.label}
			</a>
		{/each}
		<form method="POST" action="/api/v1/customer/auth/logout" class="ml-auto">
			<button
				type="submit"
				class="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors whitespace-nowrap"
			>
				Sign out
			</button>
		</form>
	</nav>

	{@render children()}
</div>
