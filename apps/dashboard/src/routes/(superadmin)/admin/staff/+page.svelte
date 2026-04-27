<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Users from '@lucide/svelte/icons/users';
	import Mail from '@lucide/svelte/icons/mail';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Store from '@lucide/svelte/icons/store';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Shield from '@lucide/svelte/icons/shield';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Send from '@lucide/svelte/icons/send';

	let { data } = $props();

	const tab = $derived(data.tab || 'staff');

	// Staff tab
	const staff = $derived(data.staff?.staff || []);
	const staffTotal = $derived(data.staff?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
	const totalPages = $derived(Math.ceil(staffTotal / 20) || 1);
	const storeFilter = $derived(data.storeId || '');
	const roleFilter = $derived(data.role || '');

	// Invitations tab
	const invitations = $derived(data.invitations?.invitations || []);
	const invTotal = $derived(data.invitations?.total || 0);
	const invPage = $derived(Number(page.url.searchParams.get('page')) || 1);
	const invTotalPages = $derived(Math.ceil(invTotal / 20) || 1);
	const invStatusFilter = $derived(data.status || '');

	let processingId = $state<string | null>(null);

	function switchTab(newTab: string) {
		const params = new URLSearchParams();
		params.set('tab', newTab);
		goto(`/admin/staff?${params}`, { keepFocus: true });
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		if (p > 1) params.set('page', String(p));
		else params.delete('page');
		goto(`/admin/staff?${params}`, { keepFocus: true });
	}

	function updateFilter(key: string, value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		if (value) params.set(key, value);
		else params.delete(key);
		goto(`/admin/staff?${params}`, { keepFocus: true });
	}

	function roleVariant(role: string) {
		switch (role) {
			case 'MANAGER': return 'default';
			case 'CASHIER': return 'secondary';
			default: return 'outline';
		}
	}

	function invStatusVariant(status: string) {
		switch (status) {
			case 'pending': return 'secondary';
			case 'accepted': return 'default';
			case 'rejected': return 'outline';
			case 'expired': return 'destructive';
			case 'revoked': return 'outline';
			default: return 'secondary';
		}
	}

	function formatDate(d: string) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	async function removeStaff(userId: string) {
		processingId = userId;
		try {
			const res = await fetch(`/api/v1/admin/staff/${userId}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed');
			toast.success('Staff removed');
			goto('/admin/staff', { invalidateAll: true });
		} catch {
			toast.error('Failed to remove staff');
		} finally {
			processingId = null;
		}
	}

	async function revokeInvitation(id: string) {
		processingId = id;
		try {
			const res = await fetch(`/api/v1/admin/staff/invitations/${id}/revoke`, {
				method: 'PATCH',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed');
			toast.success('Invitation revoked');
			goto('/admin/staff', { invalidateAll: true });
		} catch {
			toast.error('Failed to revoke invitation');
		} finally {
			processingId = null;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Staff Management</h1>
		<p class="text-muted-foreground">View and manage staff members across all stores.</p>
	</div>

	<Tabs.Root value={tab} onValueChange={(v) => switchTab(v)} class="w-full">
		<Tabs.List>
			<Tabs.Trigger value="staff">Staff Members</Tabs.Trigger>
			<Tabs.Trigger value="invitations">Invitations</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="staff" class="mt-6 space-y-4">
			<Card>
				<CardContent class="p-4">
					<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
						<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
							<Users class="w-4 h-4 text-muted-foreground shrink-0" />
							<span class="text-sm text-muted-foreground">Filters:</span>
						</div>
						<div class="flex flex-wrap gap-2 w-full sm:w-auto">
							<Select.Root type="single" value={roleFilter} onValueChange={(v) => updateFilter('role', v)}>
								<Select.Trigger class="w-[140px]">{roleFilter || 'All Roles'}</Select.Trigger>
								<Select.Content>
									<Select.Item value="">All Roles</Select.Item>
									<Select.Item value="MANAGER">Manager</Select.Item>
									<Select.Item value="CASHIER">Cashier</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
					</div>
				</CardContent>
			</Card>

			{#if staff.length === 0}
				<Card>
					<CardContent class="py-16 text-center">
						<Users class="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
						<p class="text-lg font-medium text-muted-foreground">No staff found</p>
						<p class="text-sm text-muted-foreground/70 mt-1">No staff members match your filters.</p>
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-3">
					{#each staff as member}
						<Card>
							<CardContent class="p-4 sm:p-5">
								<div class="flex flex-col sm:flex-row sm:items-center gap-4">
									<div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
										<span class="text-sm font-semibold text-primary">{member.email?.charAt(0)?.toUpperCase()}</span>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 flex-wrap">
											<p class="font-medium truncate">{member.email}</p>
											<Badge variant={roleVariant(member.role)} class="uppercase text-[10px]">{member.role}</Badge>
										</div>
										<p class="text-sm text-muted-foreground mt-1 truncate">
											<Store class="w-3 h-3 inline mr-1" />
											{member.store?.name || 'Unknown store'}
										</p>
										<div class="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
											<span class="flex items-center gap-1"><Calendar class="w-3 h-3" /> Added {formatDate(member.createdAt)}</span>
										</div>
									</div>
									<div class="flex items-center gap-2 shrink-0">
										<Button size="sm" variant="ghost" class="text-destructive hover:text-destructive" disabled={processingId === member.id} onclick={() => removeStaff(member.id)}>
											<Trash2 class="w-4 h-4" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>

				{#if totalPages > 1}
					<div class="flex items-center justify-between pt-2">
						<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages} · {staffTotal} members</p>
						<div class="flex items-center gap-2">
							<Button variant="outline" size="sm" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
								<ChevronLeft class="w-4 h-4" />
							</Button>
							<Button variant="outline" size="sm" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
								<ChevronRight class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</Tabs.Content>

		<Tabs.Content value="invitations" class="mt-6 space-y-4">
			<Card>
				<CardContent class="p-4">
					<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
						<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
							<Send class="w-4 h-4 text-muted-foreground shrink-0" />
							<span class="text-sm text-muted-foreground">Filter:</span>
						</div>
						<Select.Root type="single" value={invStatusFilter} onValueChange={(v) => updateFilter('status', v)}>
							<Select.Trigger class="w-[160px]">{invStatusFilter || 'All Status'}</Select.Trigger>
							<Select.Content>
								<Select.Item value="">All Status</Select.Item>
								<Select.Item value="pending">Pending</Select.Item>
								<Select.Item value="accepted">Accepted</Select.Item>
								<Select.Item value="rejected">Rejected</Select.Item>
								<Select.Item value="expired">Expired</Select.Item>
								<Select.Item value="revoked">Revoked</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</CardContent>
			</Card>

			{#if invitations.length === 0}
				<Card>
					<CardContent class="py-16 text-center">
						<Mail class="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
						<p class="text-lg font-medium text-muted-foreground">No invitations found</p>
						<p class="text-sm text-muted-foreground/70 mt-1">No staff invitations match your filters.</p>
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-3">
					{#each invitations as inv}
						<Card>
							<CardContent class="p-4 sm:p-5">
								<div class="flex flex-col sm:flex-row sm:items-center gap-4">
									<div class="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
										<Mail class="w-4 h-4 text-muted-foreground" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 flex-wrap">
											<p class="font-medium truncate">{inv.email}</p>
											<Badge variant={invStatusVariant(inv.status)} class="capitalize">{inv.status}</Badge>
											<Badge variant="outline" class="uppercase text-[10px]">{inv.role}</Badge>
										</div>
										<p class="text-sm text-muted-foreground mt-1 truncate">
											<Store class="w-3 h-3 inline mr-1" />
											{inv.store?.name || 'Unknown store'}
										</p>
										<div class="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
											<span class="flex items-center gap-1"><Calendar class="w-3 h-3" /> Sent {formatDate(inv.createdAt)}</span>
											<span class="flex items-center gap-1"><Shield class="w-3 h-3" /> Expires {formatDate(inv.expiresAt)}</span>
										</div>
									</div>
									{#if inv.status === 'pending'}
										<div class="flex items-center gap-2 shrink-0">
											<Button size="sm" variant="outline" disabled={processingId === inv.id} onclick={() => revokeInvitation(inv.id)}>
												<RotateCcw class="w-4 h-4 mr-1" /> Revoke
											</Button>
										</div>
									{/if}
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>

				{#if invTotalPages > 1}
					<div class="flex items-center justify-between pt-2">
						<p class="text-sm text-muted-foreground">Page {invPage} of {invTotalPages} · {invTotal} invitations</p>
						<div class="flex items-center gap-2">
							<Button variant="outline" size="sm" disabled={invPage <= 1} onclick={() => goToPage(invPage - 1)}>
								<ChevronLeft class="w-4 h-4" />
							</Button>
							<Button variant="outline" size="sm" disabled={invPage >= invTotalPages} onclick={() => goToPage(invPage + 1)}>
								<ChevronRight class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
