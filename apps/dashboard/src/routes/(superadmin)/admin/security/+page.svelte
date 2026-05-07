<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Lock from '@lucide/svelte/icons/lock';
	import Key from '@lucide/svelte/icons/key';
	import Activity from '@lucide/svelte/icons/activity';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);

	async function handleChangePassword(e: Event) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			toast.error('New passwords do not match');
			return;
		}
		if (newPassword.length < 8) {
			toast.error('Password must be at least 8 characters');
			return;
		}
		loading = true;
		try {
			await apiFetch('/admin/auth/password', {
				method: 'PATCH',
				body: JSON.stringify({ currentPassword, newPassword }),
			});
			toast.success('Password changed successfully');
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch {
			toast.error('Failed to change password');
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-8 stagger-children">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Activity class="w-4 h-4 text-primary" />
				<span class="text-[11px] font-mono uppercase tracking-widest text-primary">Account</span>
			</div>
			<h1 class="text-3xl font-bold tracking-tight font-heading">Security</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage your account security.</p>
		</div>
	</div>

	<div class="grid gap-6 max-w-2xl">
		<Card class="glass-card">
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-base font-heading">
					<Lock class="w-4 h-4" />
					Change Password
				</CardTitle>
				<CardDescription>Update your admin account password.</CardDescription>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleChangePassword} class="space-y-4">
					<div class="space-y-2">
						<Label for="current">Current Password</Label>
						<Input id="current" type="password" bind:value={currentPassword} required />
					</div>
					<div class="space-y-2">
						<Label for="new">New Password</Label>
						<Input id="new" type="password" bind:value={newPassword} required minlength={8} />
					</div>
					<div class="space-y-2">
						<Label for="confirm">Confirm New Password</Label>
						<Input id="confirm" type="password" bind:value={confirmPassword} required minlength={8} />
					</div>
					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}
							Changing...
						{:else}
							<Key class="w-4 h-4 mr-2" /> Change Password
						{/if}
					</Button>
				</form>
			</CardContent>
		</Card>

		<Card class="glass-card">
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-base font-heading">
					<ShieldCheck class="w-4 h-4" />
					Security Tips
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3 text-sm">
				<ul class="list-disc pl-5 space-y-1 text-muted-foreground">
					<li>Use a strong, unique password with at least 8 characters.</li>
					<li>Include uppercase, lowercase, numbers, and symbols.</li>
					<li>Do not reuse passwords across different platforms.</li>
					<li>Change your password periodically for added security.</li>
				</ul>
			</CardContent>
		</Card>
	</div>
</div>
