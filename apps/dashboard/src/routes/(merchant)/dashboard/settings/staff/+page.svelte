<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Mail from '@lucide/svelte/icons/mail';
	import UserCog from '@lucide/svelte/icons/user-cog';

	let { data } = $props();

	let showInviteDialog = $state(false);
	let sending = $state(false);
	let form = $state({ email: '', role: 'MANAGER' });

	const roles = ['MANAGER', 'CASHIER'];

	async function sendInvite() {
		if (!form.email.trim()) { toast.error('Email is required'); return; }
		sending = true;
		try {
			await apiFetch('/merchant/staff/invite', {
				method: 'POST',
				body: JSON.stringify({ email: form.email, role: form.role }),
			});
			toast.success('Invitation sent');
			showInviteDialog = false;
			form = { email: '', role: 'MANAGER' };
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to send invite');
		} finally { sending = false; }
	}

	async function removeStaff(id: string) {
		if (!confirm('Remove this staff member?')) return;
		try {
			await apiFetch(`/merchant/staff/${id}`, { method: 'DELETE' });
			toast.success('Staff member removed');
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to remove staff');
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const roleColors: Record<string, string> = {
		OWNER: 'bg-primary/15 text-primary border-primary/30',
		MANAGER: 'bg-info/15 text-info border-info/30',
		CASHIER: 'bg-warning/15 text-warning border-warning/30',
	};
</script>

<div class="space-y-6 max-w-3xl">
	<!-- Staff Members -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between">
			<div>
				<CardTitle class="flex items-center gap-2"><UserCog class="w-5 h-5" />Staff Members</CardTitle>
				<CardDescription>Manage who has access to your dashboard</CardDescription>
			</div>
			<Button onclick={() => showInviteDialog = true} size="sm" class="gap-2">
				<Plus class="w-4 h-4" />
				Invite
			</Button>
		</CardHeader>
		<CardContent class="p-0">
			{#if data.staff.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>No staff members yet</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Email</Table.Head>
							<Table.Head class="text-center">Role</Table.Head>
							<Table.Head>Joined</Table.Head>
							<Table.Head class="text-right w-20">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.staff as member (member.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{member.email}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={roleColors[member.role] || ''}>{member.role}</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(member.createdAt)}</Table.Cell>
								<Table.Cell class="text-right">
									{#if member.role !== 'OWNER'}
										<button onclick={() => removeStaff(member.id)} class="p-1.5 rounded hover:bg-destructive/10" title="Remove">
											<Trash2 class="w-4 h-4 text-destructive" />
										</button>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</CardContent>
	</Card>

	<!-- Pending Invitations -->
	{#if data.invitations && data.invitations.length > 0}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-base"><Mail class="w-4 h-4" />Pending Invitations</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Email</Table.Head>
							<Table.Head class="text-center">Role</Table.Head>
							<Table.Head>Sent</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.invitations as inv (inv.id)}
							<Table.Row>
								<Table.Cell>{inv.email}</Table.Cell>
								<Table.Cell class="text-center"><Badge variant="secondary">{inv.role}</Badge></Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(inv.createdAt)}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge variant="outline">{inv.status || 'pending'}</Badge>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</CardContent>
		</Card>
	{/if}
</div>

<Dialog.Root bind:open={showInviteDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Invite Staff Member</Dialog.Title>
			<Dialog.Description>Send an invitation email to join your team.</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); sendInvite(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="inviteEmail">Email *</Label>
				<Input id="inviteEmail" type="email" bind:value={form.email} placeholder="staff@example.com" required />
			</div>
			<div class="space-y-2">
				<Label for="inviteRole">Role</Label>
				<Select.Root type="single" value={form.role} onValueChange={(v) => form.role = v}>
					<Select.Trigger class="w-full">
						{form.role}
					</Select.Trigger>
					<Select.Content>
						{#each roles as role}
							<Select.Item value={role}>{role}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showInviteDialog = false}>Cancel</Button>
				<Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send Invite'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
