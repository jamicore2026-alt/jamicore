<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import Search from '@lucide/svelte/icons/search';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Users from '@lucide/svelte/icons/users';
	import Tag from '@lucide/svelte/icons/tag';
	import X from '@lucide/svelte/icons/x';

	let { data } = $props();

		// svelte-ignore state_referenced_locally
	let { search = '', tags = '' } = data;
	let searchValue = $state(search);
	let tagFilter = $state(tags);

	const customers = $derived(data.customers?.data || []);
	const total = $derived(data.customers?.pagination?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	function doSearch() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) params.set('search', searchValue);
		else params.delete('search');
		if (tagFilter) params.set('tags', tagFilter);
		else params.delete('tags');
		params.set('page', '1');
		goto(`/dashboard/customers?${params}`);
	}

	function clearFilters() {
		searchValue = '';
		tagFilter = '';
		goto('/dashboard/customers');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/customers?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function parseTags(tags: string | null): string[] {
		if (!tags) return [];
		return tags.split(',').map((t) => t.trim()).filter(Boolean);
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Customers</h1>
		<p class="text-muted-foreground">View and manage your customer base</p>
	</div>

	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex flex-col sm:flex-row gap-3">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input bind:value={searchValue} placeholder="Search by name or email..." class="pl-10" />
				</div>
				<div class="relative flex-1">
					<Tag class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input bind:value={tagFilter} placeholder="Filter by tag..." class="pl-10" />
				</div>
				<Button type="submit" variant="secondary">Search</Button>
				{#if searchValue || tagFilter}
					<Button type="button" variant="ghost" size="icon" onclick={clearFilters}>
						<X class="w-4 h-4" />
					</Button>
				{/if}
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} customer{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if customers.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Users class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No customers found</p>
					<p class="text-sm mt-1">Customers will appear here after they register.</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Email</Table.Head>
							<Table.Head>Phone</Table.Head>
							<Table.Head>Tags</Table.Head>
							<Table.Head class="text-center">Verified</Table.Head>
							<Table.Head>Joined</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each customers as customer (customer.id)}
							<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/dashboard/customers/${customer.id}`)}>
								<Table.Cell class="font-medium">
									{customer.firstName || ''} {customer.lastName || ''}
									{#if !customer.firstName && !customer.lastName}
										<span class="text-muted-foreground">—</span>
									{/if}
								</Table.Cell>
								<Table.Cell>{customer.email}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{customer.phone || '—'}</Table.Cell>
								<Table.Cell>
									<div class="flex flex-wrap gap-1">
										{#each parseTags(customer.tags) as tag}
											<Badge variant="secondary" class="text-[10px]">{tag}</Badge>
										{/each}
									</div>
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if customer.isVerified}
										<Badge class="bg-success/15 text-success border-success/30">Verified</Badge>
									{:else}
										<Badge variant="secondary">Unverified</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(customer.createdAt)}</Table.Cell>
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
