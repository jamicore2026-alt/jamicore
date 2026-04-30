<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import ArrowUpCircle from '@lucide/svelte/icons/arrow-up-circle';
	import ArrowDownCircle from '@lucide/svelte/icons/arrow-down-circle';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Package from '@lucide/svelte/icons/package';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import Users from '@lucide/svelte/icons/users';
	import Receipt from '@lucide/svelte/icons/receipt';

	let { data } = $props();
	let billing = $derived(data.billing);
	let upgrading = $state(false);
	let selectedPlan = $state<any>(null);
	let showUpgradeDialog = $state(false);

	function isTrial(store: any) {
		return store?.trialEndsAt && new Date(store.trialEndsAt) > new Date();
	}

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 MB';
		const mb = bytes / (1024 * 1024);
		if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
		return `${mb.toFixed(0)} MB`;
	}

	function formatDate(d: string) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getUsagePercent(used: number, max: number | null) {
		if (max === null || max === undefined) return 0;
		return Math.min(100, Math.round((used / max) * 100));
	}

	function getUsageColor(percent: number) {
		if (percent >= 90) return 'bg-destructive';
		if (percent >= 75) return 'bg-amber-500';
		return 'bg-emerald-500';
	}

	function openUpgrade(plan: any) {
		selectedPlan = plan;
		showUpgradeDialog = true;
	}

	async function confirmUpgrade() {
		if (!selectedPlan) return;
		upgrading = true;
		try {
			await apiFetch('/merchant/billing/upgrade', {
				method: 'POST',
				body: JSON.stringify({ planId: selectedPlan.id }),
			});
			toast.success(`Upgraded to ${selectedPlan.name}`);
			showUpgradeDialog = false;
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to upgrade plan');
		} finally {
			upgrading = false;
		}
	}

	function planAction(plan: any) {
		if (!billing?.store?.planId) return 'upgrade';
		if (plan.id === billing.store.planId) return 'current';
		const currentPrice = Number(billing.plan?.price ?? 0);
		const newPrice = Number(plan.price ?? 0);
		return newPrice > currentPrice ? 'upgrade' : 'downgrade';
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
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
			<h2 class="text-lg font-semibold mb-4">Available Plans</h2>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each billing.plans || [] as plan}
					<Card class={plan.id === billing.store?.planId ? 'border-primary ring-1 ring-primary' : ''}>
						<CardHeader class="pb-3">
							<div class="flex items-center justify-between">
								<CardTitle class="text-base">{plan.name}</CardTitle>
								{#if plan.id === billing.store?.planId}
									<Badge variant="default" class="text-xs">Current</Badge>
								{/if}
							</div>
							<CardDescription class="text-sm">{plan.description || ''}</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="text-2xl font-bold">
								${plan.price || '0'}
								<span class="text-sm font-normal text-muted-foreground">/ {plan.interval || 'month'}</span>
							</div>

							<div class="space-y-2 text-sm">
								<div class="flex items-center gap-2">
									<Package class="w-4 h-4 text-muted-foreground" />
									<span>{plan.maxProducts ?? 0} products</span>
								</div>
								<div class="flex items-center gap-2">
									<HardDrive class="w-4 h-4 text-muted-foreground" />
									<span>{plan.maxStorage ?? 0} MB storage</span>
								</div>
								<div class="flex items-center gap-2">
									<Users class="w-4 h-4 text-muted-foreground" />
									<span>{plan.maxStaff ?? 0} staff</span>
								</div>
							</div>

							{#if plan.features?.length}
								<ul class="space-y-1 text-sm">
									{#each plan.features as feature}
										<li class="flex items-center gap-2">
											<CheckCircle class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
											<span>{feature}</span>
										</li>
									{/each}
								</ul>
							{/if}

							{#if plan.id !== billing.store?.planId}
								{@const action = planAction(plan)}
								<Button
									class="w-full gap-2"
									variant={action === 'upgrade' ? 'default' : 'outline'}
									onclick={() => openUpgrade(plan)}
								>
									{#if action === 'upgrade'}
										<ArrowUpCircle class="w-4 h-4" />
									{:else}
										<ArrowDownCircle class="w-4 h-4" />
									{/if}
									{action === 'upgrade' ? 'Upgrade' : 'Downgrade'}
								</Button>
							{:else}
								<Button variant="secondary" class="w-full" disabled>
									<CheckCircle class="w-4 h-4 mr-1" />
									Current Plan
								</Button>
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

<!-- Upgrade Dialog -->
<Dialog.Root bind:open={showUpgradeDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Change Plan</Dialog.Title>
			<Dialog.Description>
				You are changing from <strong>{billing?.plan?.name || 'Current'}</strong> to <strong>{selectedPlan?.name}</strong>.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-2">
			<div class="flex justify-between text-sm">
				<span class="text-muted-foreground">New plan price</span>
				<span class="font-medium">${selectedPlan?.price || '0'} / {selectedPlan?.interval || 'month'}</span>
			</div>
			<div class="flex justify-between text-sm">
				<span class="text-muted-foreground">Products limit</span>
				<span class="font-medium">{selectedPlan?.maxProducts ?? 0}</span>
			</div>
			<div class="flex justify-between text-sm">
				<span class="text-muted-foreground">Storage limit</span>
				<span class="font-medium">{selectedPlan?.maxStorage ?? 0} MB</span>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showUpgradeDialog = false)}>Cancel</Button>
			<Button onclick={confirmUpgrade} disabled={upgrading} class="gap-2">
				{#if upgrading}
					<span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
					Processing...
				{:else}
					Confirm Change
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

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
