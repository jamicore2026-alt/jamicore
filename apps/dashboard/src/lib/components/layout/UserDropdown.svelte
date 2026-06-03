<script lang="ts">
	import { goto } from '$app/navigation';
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

	export type UserDropdownVariant = 'light' | 'dark';

	interface Props {
		initials: string;
		displayName: string;
		role: string;
		variant?: UserDropdownVariant;
		/** Path to the user's profile page; if omitted, the "Profile" item is hidden. */
		profileHref?: string;
		/** CSS selector of the logout form to submit on sign-out. */
		logoutFormSelector: string;
	}

	let {
		initials,
		displayName,
		role,
		variant = 'light',
		profileHref,
		logoutFormSelector,
	}: Props = $props();

	const triggerClass = $derived(
		variant === 'dark'
			? 'flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors outline-none'
			: 'flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent outline-none',
	);

	const contentClass = $derived(
		variant === 'dark'
			? 'w-56 max-w-[calc(100vw-2rem)] bg-[rgba(10,16,28,0.95)] backdrop-blur-xl border-[rgba(30,58,95,0.4)]'
			: 'w-56 z-[60]',
	);

	const avatarClass = $derived(
		variant === 'dark' ? 'h-8 w-8 ring-1 ring-primary/20' : 'h-8 w-8',
	);

	const avatarFallbackClass = $derived(
		variant === 'dark'
			? 'bg-primary/15 text-primary text-xs font-bold font-mono'
			: 'bg-primary text-primary-foreground text-xs font-medium',
	);

	const labelClass = $derived(variant === 'dark' ? 'font-heading' : '');
	const nameClass = $derived(
		variant === 'dark'
			? 'text-sm font-semibold font-heading'
			: 'text-sm font-medium',
	);
	const roleClass = $derived(
		variant === 'dark'
			? 'text-xs text-muted-foreground capitalize font-mono'
			: 'text-xs text-muted-foreground capitalize',
	);
	const triggerTextClass = $derived(
		variant === 'dark'
			? 'hidden sm:block text-sm font-medium font-heading'
			: 'hidden sm:block text-sm font-medium',
	);
	const separatorClass = $derived(
		variant === 'dark' ? 'bg-[rgba(30,58,95,0.3)]' : '',
	);
	const destructiveItemClass = $derived(
		variant === 'dark'
			? 'text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer'
			: 'text-destructive focus:text-destructive',
	);
</script>

<DropdownMenu>
	<DropdownMenuTrigger class={triggerClass}>
		<Avatar class={avatarClass} style={variant === 'dark' ? 'box-shadow: 0 0 12px rgba(6,182,212,0.1);' : ''}>
			<AvatarFallback class={avatarFallbackClass}>
				{initials}
			</AvatarFallback>
		</Avatar>
		<span class={triggerTextClass}>{displayName}</span>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end" class={contentClass}>
		<DropdownMenuLabel class={labelClass}>
			<div class="flex flex-col">
				<span class={nameClass}>{displayName}</span>
				<span class={roleClass}>{role}</span>
			</div>
		</DropdownMenuLabel>
		<DropdownMenuSeparator class={separatorClass} />
		{#if profileHref}
			<DropdownMenuItem onclick={() => goto(profileHref)}>
				<User class="w-4 h-4 mr-2" />
				Profile
			</DropdownMenuItem>
			<DropdownMenuSeparator class={separatorClass} />
		{/if}
		<DropdownMenuItem
			class={destructiveItemClass}
			onSelect={() => {
				document.querySelector<HTMLFormElement>(logoutFormSelector)?.requestSubmit();
			}}
		>
			<LogOut class="w-4 h-4 mr-2" />
			Sign out
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
