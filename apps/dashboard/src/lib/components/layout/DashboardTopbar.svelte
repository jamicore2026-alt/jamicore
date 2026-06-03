<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import UserDropdown from './UserDropdown.svelte';

	interface Props {
		user: {
			userId: string;
			storeId: string;
			role: string;
		};
		billing?: {
			store?: {
				planExpiresAt?: string | null;
			};
		} | null;
		onmenuclick?: () => void;
	}

	let { user, billing, onmenuclick }: Props = $props();

	let showExpiryWarning = $derived(() => {
		if (!billing?.store?.planExpiresAt) return false;
		const days = Math.ceil(
			(new Date(billing.store.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
		);
		return days <= 7 && days > 0;
	});

	let expiryDays = $derived(() => {
		if (!billing?.store?.planExpiresAt) return 0;
		return Math.ceil(
			(new Date(billing.store.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
		);
	});

	let expiryDate = $derived(() => {
		if (!billing?.store?.planExpiresAt) return '';
		return new Date(billing.store.planExpiresAt).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	});

	function getInitials(): string {
		return 'U';
	}
</script>

<header class="h-16 bg-card border-b flex items-center px-4 lg:px-6 shrink-0">
	<!-- Mobile hamburger -->
	<button
		class="lg:hidden p-2 rounded-md hover:bg-accent mr-2"
		onclick={onmenuclick}
		aria-label="Open menu"
	>
		<Menu class="w-5 h-5" />
	</button>

	<!-- Spacer -->
	<div class="flex-1"></div>

	<!-- Notifications -->
	<NotificationBell />

	<!-- User dropdown -->
	<UserDropdown
		initials={getInitials()}
		displayName="User"
		role={user.role}
		variant="light"
		profileHref="/dashboard/settings"
		logoutFormSelector="#logout-form"
	/>
</header>

{#if showExpiryWarning()}
	<div class="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-sm text-amber-700">
		<AlertTriangle class="w-4 h-4 shrink-0" />
		<span>
			Your plan expires in <strong>{expiryDays()} day{expiryDays() === 1 ? '' : 's'}</strong>
			({expiryDate()}).
			<a href="/dashboard/settings/billing" class="underline font-medium hover:text-amber-900">Renew now</a>
			to avoid service interruption.
		</span>
	</div>
{/if}


