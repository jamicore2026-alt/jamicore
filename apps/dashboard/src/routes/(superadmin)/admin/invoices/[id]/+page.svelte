<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import FileText from '@lucide/svelte/icons/file-text';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Store from '@lucide/svelte/icons/store';
	import Calendar from '@lucide/svelte/icons/calendar';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Activity from '@lucide/svelte/icons/activity';
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
			await apiFetch(`/admin/invoices/${invoice.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status }),
			});
			invoice.status = status;
			toast.success('Status updated');
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update status');
		}
	}
</script>

<div class="space-y-8 stagger-children">
	<div class="flex items-center gap-3">
		<Button variant="outline" size="icon" class="border-[rgba(30,58,95,0.4)] hover:bg-primary/5 hover:border-primary/30 transition-all" onclick={() => goto('/admin/invoices')}>
			<ArrowLeft class="w-4 h-4" />
		</Button>
		<div>
			<div class="flex items-center gap-2 mb-1">
				<Activity class="w-4 h-4 text-primary" />
				<span class="text-[11px] font-mono uppercase tracking-widest text-primary">Finance</span>
			</div>
			<h1 class="text-3xl font-bold tracking-tight font-heading">Invoice Detail</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and manage invoice #{invoice?.id?.slice(0, 8)}</p>
		</div>
	</div>

	{#if !invoice}
		<Card class="glass-card">
			<CardContent class="py-12 text-center text-muted-foreground">
				<div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4" style="box-shadow: 0 0 24px rgba(6,182,212,0.05);">
					<FileText class="h-7 w-7 text-muted-foreground/40" />
				</div>
				<p class="text-muted-foreground font-medium font-heading">Invoice not found.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 lg:grid-cols-3">
			<div class="lg:col-span-2 space-y-4">
				<Card class="glass-card">
					<CardHeader>
						<div class="flex items-start justify-between gap-3">
							<div>
								<CardTitle class="text-lg font-heading">Invoice #{invoice.id?.slice(0, 8)}</CardTitle>
								<p class="text-sm text-muted-foreground mt-1">{invoice.store?.name || 'Unknown store'} · {invoice.store?.domain || '—'}</p>
							</div>
							<Badge variant={statusVariant(invoice.status)} class="capitalize">{invoice.status}</Badge>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Amount</p>
								<p class="text-2xl font-bold font-heading flex items-center gap-1">
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
							<Separator class="bg-[rgba(30,58,95,0.3)]" />
							<div>
								<p class="text-xs text-muted-foreground mb-1">Notes</p>
								<p class="text-sm">{invoice.notes}</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<div class="space-y-4">
				<Card class="glass-card">
					<CardHeader>
						<CardTitle class="text-base font-heading">Actions</CardTitle>
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
