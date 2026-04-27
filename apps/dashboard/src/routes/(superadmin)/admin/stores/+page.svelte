<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Separator } from '$lib/components/ui/separator';
	import Store from '@lucide/svelte/icons/store';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';

	let { data } = $props();

	const stores = $derived(data.stores?.stores || []);
	const total = $derived(data.stores?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
		active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900',
		suspended: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
	};

	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout>;

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
			goto(`/admin/stores?${params}`);
		}, 300);
	}

	function clearSearch() {
		searchQuery = '';
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('search');
		params.set('page', '1');
		goto(`/admin/stores?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/admin/stores?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

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
			<h1 class="text-2xl font-bold tracking-tight">All Stores</h1>
			<p class="text-muted-foreground">Platform-wide store overview</p>
		</div>
	</div>

	<!-- Search -->
	<div class="relative max-w-md">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
		<Input
			placeholder="Search by name, domain, or owner..."
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

	<!-- Table -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-base">{total} store{total !== 1 ? 's' : ''}{data.search ? ` matching "${data.search}"` : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if stores.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<Store class="w-12 h-12 text-muted-foreground/40 mb-3" />
					<p class="text-lg font-medium text-muted-foreground">
						{data.search ? 'No stores found' : 'No stores yet'}
					</p>
					{#if data.search}
						<p class="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
					{:else}
						<p class="text-sm text-muted-foreground/70 mt-1">Stores will appear here once merchants register</p>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-[200px]">Store</Table.Head>
								<Table.Head>Domain</Table.Head>
								<Table.Head class="hidden sm:table-cell">Owner</Table.Head>
								<Table.Head class="hidden md:table-cell">Plan</Table.Head>
								<Table.Head class="text-center">Status</Table.Head>
								<Table.Head class="text-right hidden md:table-cell">Created</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each stores as store (store.id)}
								<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/admin/merchants/${store.id}`)}>
									<Table.Cell class="font-medium truncate max-w-[200px]">{store.name}</Table.Cell>
									<Table.Cell class="text-muted-foreground truncate max-w-[160px]">{store.domain}</Table.Cell>
									<Table.Cell class="hidden sm:table-cell truncate max-w-[200px]">{store.ownerEmail}</Table.Cell>
									<Table.Cell class="hidden md:table-cell">
										{#if store.plan}
											<Badge variant="secondary">{store.plan.name}</Badge>
										{:else}
											<span class="text-muted-foreground">—</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-center">
										<Badge class="{statusColors[store.status] || ''} capitalize whitespace-nowrap">{store.status}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right text-muted-foreground hidden md:table-cell whitespace-nowrap">{formatDate(store.createdAt)}</Table.Cell>
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
