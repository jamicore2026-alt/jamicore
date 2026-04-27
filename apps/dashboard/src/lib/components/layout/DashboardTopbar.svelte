<script lang="ts">
	import { goto } from '$app/navigation';
	import Menu from '@lucide/svelte/icons/menu';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import LogOut from '@lucide/svelte/icons/log-out';
	import User from '@lucide/svelte/icons/user';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu';

	interface Props {
		user: {
			userId: string;
			storeId: string;
			role: string;
		};
		onmenuclick?: () => void;
	}

	let { user, onmenuclick }: Props = $props();

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
	<DropdownMenu>
		<DropdownMenuTrigger class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent outline-none">
			<Avatar class="h-8 w-8">
				<AvatarFallback class="bg-primary text-primary-foreground text-xs font-medium">
					{getInitials()}
				</AvatarFallback>
			</Avatar>
			<span class="hidden sm:block text-sm font-medium">User</span>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="w-56">
			<DropdownMenuLabel>
				<div class="flex flex-col">
					<span class="text-sm font-medium">User</span>
					<span class="text-xs text-muted-foreground capitalize">{user.role}</span>
				</div>
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem onclick={() => goto('/settings')}>
				<User class="w-4 h-4 mr-2" />
				Profile
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem
				class="text-destructive focus:text-destructive"
				onSelect={() => {
					document.querySelector<HTMLFormElement>('#logout-form')?.requestSubmit();
				}}
			>
				<LogOut class="w-4 h-4 mr-2" />
				Sign out
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</header>


