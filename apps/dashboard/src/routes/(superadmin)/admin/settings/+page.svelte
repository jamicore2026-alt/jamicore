<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import Shield from '@lucide/svelte/icons/shield';
	import Mail from '@lucide/svelte/icons/mail';
	import User from '@lucide/svelte/icons/user';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Save from '@lucide/svelte/icons/save';
	import Settings from '@lucide/svelte/icons/settings';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const admin = $derived(data.admin);
	const settings = $derived(data.settings || []);

	let editedValues = $state(<Record<string, string>>{});
	let saving = $state(false);

	function formatDate(d: string | null | undefined) {
		if (!d) return 'Never';
		return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function getSettingValue(key: string) {
		const s = settings.find((x: any) => x.key === key);
		return editedValues[key] ?? (s ? s.value : '');
	}

	function updateSettingValue(key: string, value: string) {
		editedValues = { ...editedValues, [key]: value };
	}

	async function saveSettings() {
		const changes = Object.entries(editedValues).map(([key, value]) => {
			const s = settings.find((x: any) => x.key === key);
			return { key, value, type: s?.type || 'string' };
		});
		if (changes.length === 0) {
			toast.info('No changes to save');
			return;
		}
		saving = true;
		try {
			const res = await fetch('/api/v1/admin/settings/platform', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(changes),
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to save');
			editedValues = {};
			toast.success('Settings saved');
			goto('/admin/settings', { invalidateAll: true });
		} catch {
			toast.error('Failed to save settings');
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Settings</h1>
		<p class="text-muted-foreground">Admin profile and platform settings.</p>
	</div>

	<Tabs.Root value="profile" class="w-full">
		<Tabs.List>
			<Tabs.Trigger value="profile">Profile</Tabs.Trigger>
			<Tabs.Trigger value="platform">Platform Settings</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="profile" class="mt-6">
			{#if !admin}
				<Card>
					<CardContent class="py-12 text-center text-muted-foreground">
						<Shield class="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p>Failed to load admin profile.</p>
					</CardContent>
				</Card>
			{:else}
				<div class="grid gap-6 max-w-2xl">
					<Card>
						<CardHeader>
							<CardTitle class="flex items-center gap-2">
								<User class="w-4 h-4" />
								Profile
							</CardTitle>
							<CardDescription>Your admin account information.</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="flex items-center gap-3">
								<div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
									{admin.name?.charAt(0)?.toUpperCase() || 'A'}
								</div>
								<div>
									<p class="font-medium">{admin.name || 'Admin'}</p>
									<p class="text-sm text-muted-foreground">{admin.email}</p>
								</div>
								<Badge class="ml-auto capitalize">{admin.isActive ? 'Active' : 'Inactive'}</Badge>
							</div>

							<Separator />

							<div class="grid gap-3 text-sm">
								<div class="flex items-center gap-2">
									<Mail class="w-4 h-4 text-muted-foreground" />
									<span class="text-muted-foreground">Email:</span>
									<span>{admin.email}</span>
								</div>
								<div class="flex items-center gap-2">
									<Calendar class="w-4 h-4 text-muted-foreground" />
									<span class="text-muted-foreground">Last Login:</span>
									<span>{formatDate(admin.lastLoginAt)}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle class="flex items-center gap-2">
								<KeyRound class="w-4 h-4" />
								Security
							</CardTitle>
							<CardDescription>Manage your account security.</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="outline" onclick={() => goto('/admin/security')}>
								Change Password
							</Button>
						</CardContent>
					</Card>
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="platform" class="mt-6">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Settings class="w-4 h-4" />
						Platform Settings
					</CardTitle>
					<CardDescription>Configure platform-wide settings.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if settings.length === 0}
						<p class="text-sm text-muted-foreground text-center py-8">No platform settings configured yet.</p>
					{:else}
						{#each settings as setting}
							<div class="grid gap-2">
								<label class="text-sm font-medium">{setting.key}</label>
								<Input
									value={getSettingValue(setting.key)}
									onchange={(e) => updateSettingValue(setting.key, e.currentTarget.value)}
									placeholder="Value"
								/>
								{#if setting.type}
									<p class="text-xs text-muted-foreground">Type: {setting.type} · Updated: {formatDate(setting.updatedAt)}</p>
								{/if}
							</div>
							{#if setting !== settings[settings.length - 1]}
								<Separator />
							{/if}
						{/each}
						<div class="flex justify-end pt-2">
							<Button onclick={saveSettings} disabled={saving || Object.keys(editedValues).length === 0}>
								<Save class="w-4 h-4 mr-2" />
								{saving ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					{/if}
				</CardContent>
			</Card>
		</Tabs.Content>
	</Tabs.Root>
</div>
