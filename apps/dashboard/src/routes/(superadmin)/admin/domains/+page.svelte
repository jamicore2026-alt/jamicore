<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import Globe from '@lucide/svelte/icons/globe';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Shield from '@lucide/svelte/icons/shield';
	import Store from '@lucide/svelte/icons/store';
	import Calendar from '@lucide/svelte/icons/calendar';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	const domains = $derived(data.domains?.domains || []);
	const total = $derived(data.domains?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
	const totalPages = $derived(Math.ceil(total / 20) || 1);
	const verifiedFilter = $derived(data.verified ?? '');

	let processingId = $state<string | null>(null);

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		if (p > 1) params.set('page', String(p));
		else params.delete('page');
		goto(`/admin/domains?${params}`, { keepFocus: true });
	}

	function updateVerified(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		if (value !== '') params.set('verified', value);
		else params.delete('verified');
		goto(`/admin/domains?${params}`, { keepFocus: true });
	}

	function formatDate(d: string) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	async function verifyDomain(storeId: string) {
		processingId = storeId;
		try {
			const res = await fetch(`/api/v1/admin/domains/${storeId}/verify`, {
				method: 'POST',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed');
			toast.success('Domain verified');
			goto('/admin/domains', { invalidateAll: true });
		} catch {
			toast.error('Failed to verify domain');
		} finally {
			processingId = null;
		}
	}

	async function rejectDomain(storeId: string) {
		processingId = storeId;
		try {
			const res = await fetch(`/api/v1/admin/domains/${storeId}/reject`, {
				method: 'POST',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed');
			toast.success('Domain rejected');
			goto('/admin/domains', { invalidateAll: true });
		} catch {
			toast.error('Failed to reject domain');
		} finally {
			processingId = null;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Custom Domains</h1>
		<p class="text-muted-foreground">Review and verify merchant custom domain requests.</p>
	</div>

	<Card>
		<CardContent class="p-4">
			<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
					<Globe class="w-4 h-4 text-muted-foreground shrink-0" />
					<span class="text-sm text-muted-foreground">Filter:</span>
				</div>
				<Select.Root type="single" value={verifiedFilter} onValueChange={(v) => updateVerified(v)}>
					<Select.Trigger class="w-[180px]">
						{#if verifiedFilter === ''}
							All Domains
						{:else if verifiedFilter === 'true'}
							Verified
						{:else}
							Pending Verification
						{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Domains</Select.Item>
						<Select.Item value="true">Verified</Select.Item>
						<Select.Item value="false">Pending Verification</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</CardContent>
	</Card>

	{#if domains.length === 0}
		<Card>
			<CardContent class="py-16 text-center">
				<Globe class="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
				<p class="text-lg font-medium text-muted-foreground">No custom domains found</p>
				<p class="text-sm text-muted-foreground/70 mt-1">Merchants haven't requested any custom domains yet.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each domains as store}
				<Card>
					<CardContent class="p-4 sm:p-5">
						<div class="flex flex-col sm:flex-row sm:items-center gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<h3 class="font-medium truncate">{store.customDomain}</h3>
									{#if store.customDomainVerified}
										<Badge variant="default" class="gap-1">
											<CheckCircle class="w-3 h-3" /> Verified
										</Badge>
									{:else}
										<Badge variant="secondary" class="gap-1">
											<Shield class="w-3 h-3" /> Pending
										</Badge>
									{/if}
								</div>
								<p class="text-sm text-muted-foreground mt-1 truncate">
									<Store class="w-3 h-3 inline mr-1" />
									{store.name}
								</p>
								<div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
									<span class="flex items-center gap-1">
										<Calendar class="w-3 h-3" />
										Requested {formatDate(store.createdAt)}
									</span>
									{#if store.customDomainVerifiedAt}
										<span class="flex items-center gap-1">
											<CheckCircle class="w-3 h-3" />
											Verified {formatDate(store.customDomainVerifiedAt)}
										</span>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								{#if !store.customDomainVerified}
									<Button size="sm" variant="default" disabled={processingId === store.id} onclick={() => verifyDomain(store.id)}>
										<CheckCircle class="w-4 h-4 mr-1" />
										Verify
									</Button>
									<Button size="sm" variant="outline" disabled={processingId === store.id} onclick={() => rejectDomain(store.id)}>
										<XCircle class="w-4 h-4 mr-1" />
										Reject
									</Button>
								{/if}
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-between pt-2">
				<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages} · {total} domains</p>
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
</div>
