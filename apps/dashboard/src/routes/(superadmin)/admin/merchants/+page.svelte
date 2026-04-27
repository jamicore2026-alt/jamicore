<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';

	let { data } = $props();

	const merchants = $derived(data.merchants?.merchants || []);
	const total = $derived(data.merchants?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const statuses = ['', 'pending', 'active', 'suspended'];

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
		active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900',
		suspended: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
	};

	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout>;

	function filterByStatus(s: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (s) params.set('status', s);
		else params.delete('status');
		params.set('page', '1');
		goto(`/admin/merchants?${params}`);
	}

	function handleSearch(query: string) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const params = new URLSearchParams(page.url.searchParams);
			if (query.trim()) {
				params.set('search', query.trim());
			} else {
				params.delete('search');
			}
			params.set('page', '1');
			goto(`/admin/merchants?${params}`);
		}, 300);
	}

	function clearSearch() {
		searchQuery = '';
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('search');
		params.set('page', '1');
		goto(`/admin/merchants?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/admin/merchants?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// Sync searchQuery from URL on mount
	$effect(() => {
		const urlSearch = page.url.searchParams.get('search') || '';
		if (urlSearch !== searchQuery) {
			searchQuery = urlSearch;
		}
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Merchants</h1>
			<p class="text-muted-foreground">Manage merchant stores and approvals</p>
		</div>
		<Button onclick={() => goto('/admin/merchants/new')} class="gap-2 shrink-0">
			<Plus class="w-4 h-4" />
			Add Merchant
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<div class="relative flex-1 max-w-md">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				placeholder="Search by name, domain, or email..."
				class="pl-9 pr-9"
				bind:value={searchQuery}
				oninput={() => handleSearch(searchQuery)}
			/>
			{#if searchQuery}
				<button
					class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					onclick={clearSearch}
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each statuses as s}
				<Button variant={data.status === s ? 'default' : 'outline'} size="sm" onclick={() => filterByStatus(s)}>
					{s || 'All'}
				</Button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-base">{total} merchant{total !== 1 ? 's' : ''}{data.search ? ` matching "${data.search}"` : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if merchants.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<Building2 class="w-12 h-12 text-muted-foreground/40 mb-3" />
					<p class="text-lg font-medium text-muted-foreground">
						{data.search ? 'No merchants found' : 'No merchants yet'}
					</p>
					{#if data.search}
						<p class="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
					{:else}
						<p class="text-sm text-muted-foreground/70 mt-1">Add your first merchant to get started</p>
						<Button onclick={() => goto('/admin/merchants/new')} class="mt-4 gap-2">
							<Plus class="w-4 h-4" /> Add Merchant
						</Button>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-[200px]">Store Name</Table.Head>
								<Table.Head>Domain</Table.Head>
								<Table.Head class="hidden sm:table-cell">Owner Email</Table.Head>
								<Table.Head class="text-center">Status</Table.Head>
								<Table.Head class="text-right hidden md:table-cell">Created</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each merchants as merchant (merchant.id)}
								<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/admin/merchants/${merchant.id}`)}>
									<Table.Cell class="font-medium truncate max-w-[200px]">{merchant.name}</Table.Cell>
									<Table.Cell class="text-muted-foreground truncate max-w-[160px]">{merchant.domain}</Table.Cell>
									<Table.Cell class="hidden sm:table-cell truncate max-w-[200px]">{merchant.ownerEmail}</Table.Cell>
									<Table.Cell class="text-center">
										<Badge class="{statusColors[merchant.status] || ''} capitalize whitespace-nowrap">{merchant.status}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right text-muted-foreground hidden md:table-cell whitespace-nowrap">{formatDate(merchant.createdAt)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>

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
