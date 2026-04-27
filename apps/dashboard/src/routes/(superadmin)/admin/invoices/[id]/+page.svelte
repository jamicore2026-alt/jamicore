<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import FileText from '@lucide/svelte/icons/file-text';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Store from '@lucide/svelte/icons/store';
	import Calendar from '@lucide/svelte/icons/calendar';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const invoice = $derived(data.invoice);

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
		return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatAmount(amount: string) {
		if (!amount) return '$0.00';
		const num = Number(amount);
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
	}

	async function updateStatus(status: string) {
		try {
			const res = await fetch(`/api/v1/admin/invoices/${invoice.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status }),
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to update');
			invoice.status = status;
			toast.success('Status updated');
		} catch {
			toast.error('Failed to update status');
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-3">
		<Button variant="ghost" size="icon" onclick={() => goto('/admin/invoices')}>
			<ArrowLeft class="w-4 h-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Invoice Detail</h1>
			<p class="text-muted-foreground">View and manage invoice #{invoice?.id?.slice(0, 8)}</p>
		</div>
	</div>

	{#if !invoice}
		<Card>
			<CardContent class="py-12 text-center text-muted-foreground">
				<FileText class="w-12 h-12 mx-auto mb-3 opacity-50" />
				<p>Invoice not found.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 lg:grid-cols-3">
			<div class="lg:col-span-2 space-y-4">
				<Card>
					<CardHeader>
						<div class="flex items-start justify-between gap-3">
							<div>
								<CardTitle class="text-lg">Invoice #{invoice.id?.slice(0, 8)}</CardTitle>
								<p class="text-sm text-muted-foreground mt-1">{invoice.store?.name || 'Unknown store'} · {invoice.store?.domain || '—'}</p>
							</div>
							<Badge variant={statusVariant(invoice.status)} class="capitalize">{invoice.status}</Badge>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Amount</p>
								<p class="text-2xl font-bold flex items-center gap-1">
									<DollarSign class="w-5 h-5" />
									{formatAmount(invoice.amount)}
								</p>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Plan</p>
								<p class="text-sm font-medium flex items-center gap-1">
									<CreditCard class="w-4 h-4 text-muted-foreground" />
									{invoice.plan?.name || '—'}
								</p>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Created</p>
								<p class="text-sm font-medium flex items-center gap-1">
									<Calendar class="w-4 h-4 text-muted-foreground" />
									{formatDate(invoice.createdAt)}
								</p>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Period</p>
								<p class="text-sm font-medium">
									{invoice.periodStart ? formatDate(invoice.periodStart) : '—'} - {invoice.periodEnd ? formatDate(invoice.periodEnd) : '—'}
								</p>
							</div>
						</div>
						{#if invoice.notes}
							<Separator />
							<div>
								<p class="text-xs text-muted-foreground mb-1">Notes</p>
								<p class="text-sm">{invoice.notes}</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<div class="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Actions</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						<Select.Root type="single" value={invoice.status} onValueChange={(v) => updateStatus(v)}>
							<Select.Trigger class="w-full">
								Update Status: {invoice.status}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="pending">Pending</Select.Item>
								<Select.Item value="paid">Paid</Select.Item>
								<Select.Item value="overdue">Overdue</Select.Item>
								<Select.Item value="cancelled">Cancelled</Select.Item>
							</Select.Content>
						</Select.Root>
					</CardContent>
				</Card>
			</div>
		</div>
	{/if}
</div>
