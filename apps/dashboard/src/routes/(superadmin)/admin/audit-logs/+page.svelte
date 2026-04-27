<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Separator } from '$lib/components/ui/separator';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	const logs = $derived(data.logs?.logs || []);
	const total = $derived(data.logs?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const entityTypes = ['', 'order', 'product', 'customer', 'store', 'user', 'coupon'];
	const actions = ['', 'create', 'update', 'delete', 'login', 'logout', 'view'];

	const actionColors: Record<string, string> = {
		create: 'bg-emerald-100 text-emerald-700 border-emerald-200',
		update: 'bg-blue-100 text-blue-700 border-blue-200',
		delete: 'bg-red-100 text-red-700 border-red-200',
		login: 'bg-purple-100 text-purple-700 border-purple-200',
		logout: 'bg-gray-100 text-gray-700 border-gray-200',
		view: 'bg-amber-100 text-amber-700 border-amber-200',
	};

	function filterByEntityType(t: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (t) params.set('entityType', t);
		else params.delete('entityType');
		params.set('page', '1');
		goto(`/admin/audit-logs?${params}`);
	}

	function filterByAction(a: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (a) params.set('action', a);
		else params.delete('action');
		params.set('page', '1');
		goto(`/admin/audit-logs?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/admin/audit-logs?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatJson(metadata: unknown) {
		if (!metadata) return '—';
		try {
			const json = JSON.stringify(metadata);
			return json.length > 60 ? json.slice(0, 60) + '...' : json;
		} catch {
			return '—';
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Audit Logs</h1>
			<p class="text-muted-foreground">Platform activity and audit trail.</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<div class="flex flex-wrap gap-2">
			<span class="text-sm text-muted-foreground py-1">Type:</span>
			{#each entityTypes as t}
				<Button variant={data.entityType === t ? 'default' : 'outline'} size="sm" onclick={() => filterByEntityType(t)}>
					{t || 'All'}
				</Button>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2">
			<span class="text-sm text-muted-foreground py-1">Action:</span>
			{#each actions as a}
				<Button variant={data.action === a ? 'default' : 'outline'} size="sm" onclick={() => filterByAction(a)}>
					{a || 'All'}
				</Button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-base">{total} log{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if logs.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<ScrollText class="w-12 h-12 text-muted-foreground/40 mb-3" />
					<p class="text-lg font-medium text-muted-foreground">No logs yet</p>
					<p class="text-sm text-muted-foreground/70 mt-1">Activity logs will appear here.</p>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 px-6">
					<Table.Root class="min-w-[900px]">
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-[120px]">Date</Table.Head>
								<Table.Head class="w-[100px]">Action</Table.Head>
								<Table.Head class="w-[100px]">Type</Table.Head>
								<Table.Head>Entity</Table.Head>
								<Table.Head class="hidden lg:table-cell">Store</Table.Head>
								<Table.Head class="hidden xl:table-cell">IP</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each logs as log (log.id)}
								<Table.Row>
									<Table.Cell class="text-muted-foreground whitespace-nowrap text-xs">{formatDate(log.createdAt)}</Table.Cell>
									<Table.Cell>
										<Badge class="{actionColors[log.action] || 'bg-gray-100 text-gray-700'} capitalize whitespace-nowrap text-xs">{log.action}</Badge>
									</Table.Cell>
									<Table.Cell class="capitalize text-sm">{log.entityType}</Table.Cell>
									<Table.Cell class="font-mono text-xs truncate max-w-[200px]">{log.entityId}</Table.Cell>
									<Table.Cell class="hidden lg:table-cell text-sm">{log.store?.name || '—'}</Table.Cell>
									<Table.Cell class="hidden xl:table-cell text-xs text-muted-foreground font-mono">{log.ipAddress || '—'}</Table.Cell>
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
