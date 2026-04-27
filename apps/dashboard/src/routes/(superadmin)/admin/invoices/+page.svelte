<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import FileText from '@lucide/svelte/icons/file-text';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Store from '@lucide/svelte/icons/store';
	import Calendar from '@lucide/svelte/icons/calendar';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	const invoices = $derived(data.invoices?.invoices || []);
	const total = $derived(data.invoices?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
	const totalPages = $derived(Math.ceil(total / 20) || 1);

	const statusFilter = $derived(data.status || '');

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		if (p > 1) params.set('page', String(p));
		else params.delete('page');
		goto(`/admin/invoices?${params}`, { keepFocus: true });
	}

	function updateStatus(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.delete('page');
		if (value) params.set('status', value);
		else params.delete('status');
		goto(`/admin/invoices?${params}`, { keepFocus: true });
	}

	function statusVariant(s: string) {
		switch (s) {
			case 'paid': return 'default';
			case 'pending': return 'secondary';
			case 'overdue': return 'destructive';
			case 'cancelled': return 'outline';
			default: return 'secondary';
		}
	}

	function formatDate(d: string) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatAmount(amount: string) {
		if (!amount) return '$0.00';
		const num = Number(amount);
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Invoices</h1>
		<p class="text-muted-foreground">Manage platform invoices and billing.</p>
	</div>

	<Card>
		<CardContent class="p-4">
			<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
					<FileText class="w-4 h-4 text-muted-foreground shrink-0" />
					<span class="text-sm text-muted-foreground">Filter:</span>
				</div>
				<Select.Root type="single" value={statusFilter} onValueChange={(v) => updateStatus(v)}>
					<Select.Trigger class="w-[160px]">
						{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'All Status'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Status</Select.Item>
						<Select.Item value="pending">Pending</Select.Item>
						<Select.Item value="paid">Paid</Select.Item>
						<Select.Item value="overdue">Overdue</Select.Item>
						<Select.Item value="cancelled">Cancelled</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</CardContent>
	</Card>

	{#if invoices.length === 0}
		<Card>
			<CardContent class="py-16 text-center">
				<FileText class="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
				<p class="text-lg font-medium text-muted-foreground">No invoices found</p>
				<p class="text-sm text-muted-foreground/70 mt-1">There are no invoices matching your filters.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each invoices as invoice}
				<Card class="hover:border-primary/30 transition-colors cursor-pointer" onclick={() => goto(`/admin/invoices/${invoice.id}`)}>
					<CardContent class="p-4 sm:p-5">
						<div class="flex flex-col sm:flex-row sm:items-center gap-3">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<h3 class="font-medium truncate">Invoice #{invoice.id?.slice(0, 8)}</h3>
									<Badge variant={statusVariant(invoice.status)} class="capitalize">{invoice.status}</Badge>
								</div>
								<p class="text-sm text-muted-foreground mt-1 truncate">
									<Store class="w-3 h-3 inline mr-1" />
									{invoice.store?.name || 'Unknown store'}
								</p>
								<div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
									<span class="flex items-center gap-1">
										<Calendar class="w-3 h-3" />
										{formatDate(invoice.createdAt)}
									</span>
									{#if invoice.periodStart}
										<span class="flex items-center gap-1">
											Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
										</span>
									{/if}
								</div>
							</div>
							<div class="text-right shrink-0">
								<div class="flex items-center gap-1 text-lg font-semibold">
									<DollarSign class="w-4 h-4" />
									{formatAmount(invoice.amount)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-between pt-2">
				<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages} · {total} invoices</p>
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
