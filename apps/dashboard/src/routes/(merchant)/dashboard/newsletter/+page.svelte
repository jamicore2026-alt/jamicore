<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Mail from '@lucide/svelte/icons/mail';
	import Users from '@lucide/svelte/icons/users';

	let { data } = $props();

	const items = $derived(data.subscribers?.items || []);
	const total = $derived(data.subscribers?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));
	const activeFilter = $derived(data.active || '');

	const activeOptions = [
		{ value: '', label: 'All Subscribers' },
		{ value: 'true', label: 'Active' },
		{ value: 'false', label: 'Unsubscribed' },
	];

	function updateFilter(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		if (value) params.set('active', value);
		else params.delete('active');
		goto(`/dashboard/newsletter?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/newsletter?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Newsletter</h1>
		<p class="text-muted-foreground">Manage newsletter subscribers</p>
	</div>

	<!-- Stats -->
	<div class="grid gap-4 sm:grid-cols-3">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Subscribers</CardTitle>
				<Users class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{total}</div>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Active</CardTitle>
				<Mail class="w-4 h-4 text-emerald-500" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{items.filter((s) => s.isActive).length}</div>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Unsubscribed</CardTitle>
				<Mail class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{items.filter((s) => !s.isActive).length}</div>
			</CardContent>
		</Card>
	</div>

	<!-- Filter -->
	<Card>
		<CardContent class="p-4">
			<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
					<Mail class="w-4 h-4 text-muted-foreground shrink-0" />
					<span class="text-sm text-muted-foreground">Filter:</span>
				</div>
				<Select.Root type="single" value={activeFilter} onValueChange={(v) => updateFilter(v)}>
					<Select.Trigger class="w-[200px]">
						{activeOptions.find((o) => o.value === activeFilter)?.label || 'All Subscribers'}
					</Select.Trigger>
					<Select.Content>
						{#each activeOptions as opt}
							<Select.Item value={opt.value}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</CardContent>
	</Card>

	<!-- Subscribers Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} subscriber{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if items.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Mail class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No subscribers found</p>
					<p class="text-sm mt-1">Subscribers will appear here when customers sign up on your storefront.</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Email</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-right">Subscribed</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each items as sub (sub.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{sub.email}</Table.Cell>
								<Table.Cell class="text-center">
									{#if sub.isActive}
										<Badge class="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Active</Badge>
									{:else}
										<Badge variant="secondary">Unsubscribed</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground">{formatDate(sub.subscribedAt)}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				{#if totalPages > 1}
					<Separator />
					<div class="flex items-center justify-between p-4">
						<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
						<div class="flex gap-1">
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
		</CardContent>
	</Card>
</div>
