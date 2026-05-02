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
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Package from '@lucide/svelte/icons/package';

	let { data } = $props();

	const items = $derived(data.returns?.items || []);
	const total = $derived(data.returns?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));
	const statusFilter = $derived(data.status || '');

	const statuses = ['', 'requested', 'approved', 'received', 'inspected', 'refunded', 'rejected', 'cancelled'];

	const statusColors: Record<string, string> = {
		requested: 'bg-warning/15 text-warning border-warning/30',
		approved: 'bg-info/15 text-info border-info/30',
		received: 'bg-primary/15 text-primary border-primary/30',
		inspected: 'bg-secondary/15 text-secondary border-secondary/30',
		refunded: 'bg-success/15 text-success border-success/30',
		rejected: 'bg-destructive/15 text-destructive border-destructive/30',
		cancelled: 'bg-muted/15 text-muted-foreground border-muted/30',
	};

	function updateStatus(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		if (value) params.set('status', value);
		else params.delete('status');
		goto(`/dashboard/returns?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/returns?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Returns</h1>
		<p class="text-muted-foreground">Manage customer return requests</p>
	</div>

	<!-- Status Filter -->
	<Card>
		<CardContent class="p-4">
			<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
					<RotateCcw class="w-4 h-4 text-muted-foreground shrink-0" />
					<span class="text-sm text-muted-foreground">Filter:</span>
				</div>
				<Select.Root type="single" value={statusFilter} onValueChange={(v) => updateStatus(v)}>
					<Select.Trigger class="w-[180px]">
						{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'All Status'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Status</Select.Item>
						{#each statuses.slice(1) as s}
							<Select.Item value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</CardContent>
	</Card>

	<!-- Returns Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} return{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if items.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Package class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No returns found</p>
					<p class="text-sm mt-1">Return requests will appear here when customers submit them.</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Order</Table.Head>
							<Table.Head>Customer</Table.Head>
							<Table.Head>Reason</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-right">Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each items as ret (ret.id)}
							<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/dashboard/returns/${ret.id}`)}>
								<Table.Cell class="font-medium">
									#{ret.order?.orderNumber || ret.orderId?.slice(0, 8)}
								</Table.Cell>
								<Table.Cell>
									<span>{ret.customer?.email || '—'}</span>
								</Table.Cell>
								<Table.Cell class="max-w-[200px] truncate">{ret.reason}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={statusColors[ret.status] || ''}>
										{ret.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground">{formatDate(ret.createdAt)}</Table.Cell>
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
