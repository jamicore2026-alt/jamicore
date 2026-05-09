<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Package from '@lucide/svelte/icons/package';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import Users from '@lucide/svelte/icons/users';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Globe from '@lucide/svelte/icons/globe';
	import Code from '@lucide/svelte/icons/code';
	import Paintbrush from '@lucide/svelte/icons/paintbrush';
	import Headphones from '@lucide/svelte/icons/headphones';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Info from '@lucide/svelte/icons/info';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';

	let { data } = $props();
	let billing = $derived(data.billing);
	let billingInterval = $state<'month' | 'year'>('month');

	function isTrial(store: any) {
		return store?.trialEndsAt && new Date(store.trialEndsAt) > new Date();
	}

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 MB';
		const mb = bytes / (1024 * 1024);
		if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
		return `${mb.toFixed(0)} MB`;
	}

	function formatDate(d: string) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getUsagePercent(used: number, max: number | null) {
		if (max === null || max === undefined || max === 0) return 0;
		return Math.min(100, Math.round((used / max) * 100));
	}

	function getUsageColor(percent: number) {
		if (percent >= 90) return 'bg-destructive';
		if (percent >= 75) return 'bg-amber-500';
		return 'bg-emerald-500';
	}

	function getPlanPrice(plan: any) {
		if (billingInterval === 'year' && plan.annualPrice && Number(plan.annualPrice) > 0) {
			return { price: plan.annualPrice, period: 'year', label: 'Save ' + (plan.annualDiscountPercent || 0) + '%' };
		}
		return { price: plan.price, period: plan.interval || 'month', label: null };
	}

	function formatNumber(n: number) {
		if (n >= 999999) return 'Unlimited';
		if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
		return String(n);
	}

	function formatFee(fee: string) {
		const n = Number(fee);
		if (n === 0) return '0%';
		return n + '%';
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Billing &amp; Subscription</h1>
		<p class="text-muted-foreground">Manage your plan, usage, and invoices</p>
	</div>

	{#if !billing}
		<Card>
			<CardContent class="py-12 text-center">
				<p class="text-muted-foreground">Unable to load billing information.</p>
			</CardContent>
		</Card>
	{:else}
		<!-- Current Plan -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CreditCard class="w-5 h-5 text-primary" />
					Current Plan
				</CardTitle>
				<CardDescription>Your subscription details</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-start justify-between flex-wrap gap-4">
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-xl font-semibold">{billing.plan?.name || 'Free'}</h3>
							{#if isTrial(billing.store)}
								<Badge variant="secondary" class="bg-amber-500/10 text-amber-600 border-amber-500/20">Trial</Badge>
							{/if}
						</div>
						<p class="text-sm text-muted-foreground mt-1">{billing.plan?.description || 'Basic plan'}</p>
					</div>
					<div class="text-right">
						<p class="text-2xl font-bold">
							${billing.plan?.price || '0'}
							<span class="text-sm font-normal text-muted-foreground">/ {billing.plan?.interval || 'month'}</span>
						</p>
						<p class="text-xs text-muted-foreground mt-1">{billing.plan?.currency || 'USD'}</p>
						{#if billing.plan?.transactionFee}
							<p class="text-xs text-amber-600 mt-1 font-medium">{formatFee(billing.plan.transactionFee)} transaction fee</p>
						{/if}
					</div>
				</div>

				{#if billing.store?.planExpiresAt}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<Calendar class="w-4 h-4" />
						<span>Next billing: {formatDate(billing.store.planExpiresAt)}</span>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Usage Stats -->
		<Card>
			<CardHeader>
				<CardTitle>Usage</CardTitle>
				<CardDescription>Your plan limits and current usage</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				{@render usageBar('Products', billing.usage?.usedProducts ?? 0, billing.usage?.maxProducts ?? 0, Package)}
				{@render usageBar('Storage', billing.usage?.usedStorage ?? 0, (billing.usage?.maxStorage ?? 0) * 1024 * 1024, HardDrive, true)}
				{@render usageBar('Staff Members', billing.usage?.usedStaff ?? 0, billing.usage?.maxStaff ?? 0, Users)}
			</CardContent>
		</Card>

		<!-- Available Plans -->
		<div>
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold">Available Plans</h2>
				<Tabs.Root bind:value={billingInterval} class="w-auto">
					<Tabs.List class="grid w-[200px] grid-cols-2">
						<Tabs.Trigger value="month">Monthly</Tabs.Trigger>
						<Tabs.Trigger value="year">Yearly</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>

			<!-- Admin-managed notice -->
			<div class="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
				<Info class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<div>
					<p class="font-medium text-amber-700">Plan changes are administrator-managed</p>
					<p class="mt-1 text-amber-600/80">
						To upgrade or downgrade your plan, please contact platform support. Plan assignments are handled by the super administrator.
					</p>
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{#each billing.plans || [] as plan}
					{@const priceInfo = getPlanPrice(plan)}
					<Card class={plan.id === billing.store?.planId ? 'border-primary ring-1 ring-primary' : plan.isPopular ? 'border-amber-500/50 ring-1 ring-amber-500/20' : ''}>
						<CardHeader class="pb-3">
							<div class="flex items-center justify-between">
								<CardTitle class="text-base">{plan.name}</CardTitle>
								<div class="flex gap-1">
									{#if plan.id === billing.store?.planId}
										<Badge variant="default" class="text-xs">Current</Badge>
									{/if}
									{#if plan.isPopular}
										<Badge variant="secondary" class="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">Popular</Badge>
									{/if}
								</div>
							</div>
							<CardDescription class="text-sm">{plan.description || ''}</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div>
								<div class="text-2xl font-bold">
									${priceInfo.price || '0'}
									<span class="text-sm font-normal text-muted-foreground">/ {priceInfo.period}</span>
								</div>
								{#if priceInfo.label}
									<p class="text-xs text-emerald-600 font-medium">{priceInfo.label}</p>
								{/if}
								{#if Number(plan.transactionFee) > 0}
									<p class="text-xs text-muted-foreground">{formatFee(plan.transactionFee)} transaction fee</p>
								{:else}
									<p class="text-xs text-emerald-600 font-medium">No transaction fee</p>
								{/if}
							</div>

							<div class="space-y-2 text-sm">
								<div class="flex items-center gap-2">
									<Package class="w-4 h-4 text-muted-foreground shrink-0" />
									<span>{formatNumber(plan.maxProducts ?? 0)} products</span>
								</div>
								<div class="flex items-center gap-2">
									<HardDrive class="w-4 h-4 text-muted-foreground shrink-0" />
									<span>{formatBytes((plan.maxStorage ?? 0) * 1024 * 1024)} storage</span>
								</div>
								<div class="flex items-center gap-2">
									<Users class="w-4 h-4 text-muted-foreground shrink-0" />
									<span>{formatNumber(plan.maxStaff ?? 0)} staff</span>
								</div>
								<div class="flex items-center gap-2">
									<TrendingUp class="w-4 h-4 text-muted-foreground shrink-0" />
									<span>{formatNumber(plan.maxOrdersPerMonth ?? 0)} orders/mo</span>
								</div>
								<div class="flex items-center gap-2">
									<Headphones class="w-4 h-4 text-muted-foreground shrink-0" />
									<span class="capitalize">{plan.supportLevel?.replace('_', ' ') || 'Email'} support</span>
								</div>
							</div>

							<div class="space-y-1.5">
								<div class="flex items-center gap-2 text-sm">
									<Globe class="w-4 h-4 shrink-0 {plan.includesCustomDomain ? 'text-emerald-500' : 'text-muted-foreground'}" />
									<span class={plan.includesCustomDomain ? '' : 'text-muted-foreground'}>Custom domain</span>
									{#if plan.includesCustomDomain}
										<CheckCircle class="w-3.5 h-3.5 text-emerald-500 ml-auto" />
									{:else}
										<XCircle class="w-3.5 h-3.5 text-muted-foreground ml-auto" />
									{/if}
								</div>
								<div class="flex items-center gap-2 text-sm">
									<Code class="w-4 h-4 shrink-0 {plan.includesApiAccess ? 'text-emerald-500' : 'text-muted-foreground'}" />
									<span class={plan.includesApiAccess ? '' : 'text-muted-foreground'}>API access</span>
									{#if plan.includesApiAccess}
										<CheckCircle class="w-3.5 h-3.5 text-emerald-500 ml-auto" />
									{:else}
										<XCircle class="w-3.5 h-3.5 text-muted-foreground ml-auto" />
									{/if}
								</div>
								<div class="flex items-center gap-2 text-sm">
									<Paintbrush class="w-4 h-4 shrink-0 {plan.includesWhiteLabel ? 'text-emerald-500' : 'text-muted-foreground'}" />
									<span class={plan.includesWhiteLabel ? '' : 'text-muted-foreground'}>White-label</span>
									{#if plan.includesWhiteLabel}
										<CheckCircle class="w-3.5 h-3.5 text-emerald-500 ml-auto" />
									{:else}
										<XCircle class="w-3.5 h-3.5 text-muted-foreground ml-auto" />
									{/if}
								</div>
							</div>

							{#if plan.features?.length}
								<ul class="space-y-1 text-sm pt-2 border-t">
									{#each plan.features.slice(0, 5) as feature}
										<li class="flex items-center gap-2">
											<CheckCircle class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
											<span class="text-muted-foreground">{feature}</span>
										</li>
									{/each}
								</ul>
							{/if}
						</CardContent>
					</Card>
				{/each}
			</div>
		</div>

		<!-- Invoice History -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Receipt class="w-5 h-5 text-primary" />
					Invoice History
				</CardTitle>
				<CardDescription>Recent billing invoices</CardDescription>
			</CardHeader>
			<CardContent>
				{#if !billing.invoices || billing.invoices.length === 0}
					<p class="text-sm text-muted-foreground py-8 text-center">No invoices yet.</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>ID</Table.Head>
								<Table.Head>Amount</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Period</Table.Head>
								<Table.Head>Date</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each billing.invoices as invoice}
								<Table.Row>
									<Table.Cell class="font-mono text-xs">{invoice.id.slice(0, 8)}</Table.Cell>
									<Table.Cell class="font-medium">${invoice.amount}</Table.Cell>
									<Table.Cell>
										{@render statusBadge(invoice.status)}
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">
										{invoice.periodStart ? formatDate(invoice.periodStart) : '—'}
										{#if invoice.periodEnd}
											– {formatDate(invoice.periodEnd)}
										{/if}
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">{formatDate(invoice.createdAt)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>

{#snippet usageBar(label: string, used: number, max: number, Icon: any, isBytes = false)}
	{@const percent = getUsagePercent(used, max)}
	{@const colorClass = getUsageColor(percent)}
	<div class="space-y-2">
		<div class="flex items-center justify-between text-sm">
			<div class="flex items-center gap-2">
				<Icon class="w-4 h-4 text-muted-foreground" />
				<span class="font-medium">{label}</span>
			</div>
			<span class="text-muted-foreground">
				{isBytes ? formatBytes(used) : used} / {isBytes ? formatBytes(max) : max === 0 ? 'Unlimited' : max}
			</span>
		</div>
		<div class="h-2 w-full rounded-full bg-muted overflow-hidden">
			<div class="h-full rounded-full transition-all {colorClass}" style="width: {percent}%"></div>
		</div>
	</div>
{/snippet}

{#snippet statusBadge(status: string)}
	{#if status === 'paid'}
		<Badge variant="default" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>
	{:else if status === 'pending'}
		<Badge variant="secondary" class="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
	{:else if status === 'overdue'}
		<Badge variant="destructive">Overdue</Badge>
	{:else if status === 'cancelled'}
		<Badge variant="outline">Cancelled</Badge>
	{:else}
		<Badge variant="secondary">{status}</Badge>
	{/if}
{/snippet}
