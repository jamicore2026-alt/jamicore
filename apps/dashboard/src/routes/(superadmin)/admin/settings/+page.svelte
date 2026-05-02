<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
import * as Tabs from '$lib/components/ui/tabs';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Shield from '@lucide/svelte/icons/shield';
	import Mail from '@lucide/svelte/icons/mail';
	import User from '@lucide/svelte/icons/user';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Save from '@lucide/svelte/icons/save';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Activity from '@lucide/svelte/icons/activity';
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
			await apiFetch('/admin/settings/platform', {
				method: 'PUT',
				body: JSON.stringify(changes),
			});
			editedValues = {};
			toast.success('Settings saved');
			goto('/admin/settings', { invalidateAll: true });
		} catch (err: any) {
			toast.error(err?.message || 'Failed to save settings');
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-8 stagger-children">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Activity class="w-4 h-4 text-primary" />
				<span class="text-[11px] font-mono uppercase tracking-widest text-primary">Configuration</span>
			</div>
			<h1 class="text-3xl font-bold tracking-tight font-heading">Settings</h1>
			<p class="text-muted-foreground mt-1 text-sm">Admin profile and platform settings.</p>
		</div>
	</div>

	<Tabs.Root value="profile" class="w-full">
		<Tabs.List>
			<Tabs.Trigger value="profile">Profile</Tabs.Trigger>
			<Tabs.Trigger value="platform">Platform Settings</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="profile" class="mt-6">
			{#if !admin}
				<Card class="glass-card">
					<CardContent class="py-12 text-center text-muted-foreground">
						<div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4" style="box-shadow: 0 0 24px rgba(6,182,212,0.05);">
							<Shield class="h-7 w-7 text-muted-foreground/40" />
						</div>
						<p class="text-muted-foreground font-medium font-heading">Failed to load admin profile.</p>
					</CardContent>
				</Card>
			{:else}
				<div class="grid gap-6 max-w-2xl">
					<Card class="glass-card">
						<CardHeader>
							<CardTitle class="flex items-center gap-2 text-base font-heading">
								<User class="w-4 h-4" />
								Profile
							</CardTitle>
							<CardDescription>Your admin account information.</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="flex items-center gap-3">
								<div class="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-primary">
									{admin.name?.charAt(0)?.toUpperCase() || 'A'}
								</div>
								<div>
									<p class="font-medium">{admin.name || 'Admin'}</p>
									<p class="text-sm text-muted-foreground">{admin.email}</p>
								</div>
								<Badge class="ml-auto capitalize">{admin.isActive ? 'Active' : 'Inactive'}</Badge>
							</div>

							<Separator class="bg-[rgba(30,58,95,0.3)]" />

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

					<Card class="glass-card">
						<CardHeader>
							<CardTitle class="flex items-center gap-2 text-base font-heading">
								<KeyRound class="w-4 h-4" />
								Security
							</CardTitle>
							<CardDescription>Manage your account security.</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="outline" class="border-[rgba(30,58,95,0.4)] hover:bg-primary/5 hover:border-primary/30 transition-all" onclick={() => goto('/admin/security')}>
								Change Password
							</Button>
						</CardContent>
					</Card>
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="platform" class="mt-6">
			<Card class="glass-card">
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base font-heading">
						<SettingsIcon class="w-4 h-4" />
						Platform Settings
					</CardTitle>
					<CardDescription>Configure platform-wide settings.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if settings.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4" style="box-shadow: 0 0 24px rgba(6,182,212,0.05);">
								<SettingsIcon class="h-7 w-7 text-muted-foreground/40" />
							</div>
							<p class="text-sm text-muted-foreground font-medium font-heading">No platform settings configured yet.</p>
						</div>
					{:else}
						{#each settings as setting}
							<div class="grid gap-2">
								<label class="text-sm font-medium" for="setting-{setting.key}">{setting.key}</label>
								<Input
		id="setting-{setting.key}"
		value={getSettingValue(setting.key)}
									onchange={(e) => updateSettingValue(setting.key, e.currentTarget.value)}
									placeholder="Value"
								/>
								{#if setting.type}
									<p class="text-xs text-muted-foreground">Type: {setting.type} · Updated: {formatDate(setting.updatedAt)}</p>
								{/if}
							</div>
							{#if setting !== settings[settings.length - 1]}
								<Separator class="bg-[rgba(30,58,95,0.3)]" />
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
