<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { goto } from '$app/navigation';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Store from '@lucide/svelte/icons/store';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Clock from '@lucide/svelte/icons/clock';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Ban from '@lucide/svelte/icons/ban';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Activity from '@lucide/svelte/icons/activity';
	import Zap from '@lucide/svelte/icons/zap';

	let { data } = $props();

	const stats = $derived(data.stats || {
		totalStores: 0,
		activeStores: 0,
		pendingStores: 0,
		suspendedStores: 0,
		totalPlans: 0,
		recentStores: [],
		storesByStatus: {},
	});

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const statCards = $derived([
		{
			label: 'Total Merchants',
			value: stats.totalStores,
			sublabel: 'All registered stores',
			icon: Building2,
			accent: 'cyan',
			gradient: 'from-primary/20 to-primary/5',
			glow: 'rgba(6,182,212,0.15)',
		},
		{
			label: 'Active Stores',
			value: stats.activeStores,
			sublabel: stats.totalStores > 0 ? `${Math.round((stats.activeStores / stats.totalStores) * 100)}% of total` : '0% of total',
			icon: Store,
			accent: 'emerald',
			gradient: 'from-emerald-500/20 to-emerald-500/5',
			glow: 'rgba(16,185,129,0.15)',
		},
		{
			label: 'Pending Approval',
			value: stats.pendingStores,
			sublabel: stats.pendingStores > 0 ? 'Needs attention' : 'All caught up',
			icon: Clock,
			accent: 'amber',
			gradient: 'from-amber-500/20 to-amber-500/5',
			glow: 'rgba(245,158,11,0.15)',
		},
		{
			label: 'Suspended',
			value: stats.suspendedStores,
			sublabel: 'Inactive accounts',
			icon: Ban,
			accent: 'rose',
			gradient: 'from-rose-500/20 to-rose-500/5',
			glow: 'rgba(244,63,94,0.15)',
		},
	]);

	const statusConfig = [
		{ key: 'active', label: 'Active', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.4)' },
		{ key: 'pending', label: 'Pending', color: 'bg-amber-500', glow: 'rgba(245,158,11,0.4)' },
		{ key: 'suspended', label: 'Suspended', color: 'bg-rose-500', glow: 'rgba(244,63,94,0.4)' },
	];

	function borderCls(accent: string): string {
		switch (accent) {
			case 'cyan': return 'border-primary/20';
			case 'emerald': return 'border-emerald-500/20';
			case 'amber': return 'border-amber-500/20';
			case 'rose': return 'border-rose-500/20';
			default: return '';
		}
	}

	function textCls(accent: string): string {
		switch (accent) {
			case 'cyan': return 'text-primary';
			case 'emerald': return 'text-emerald-500';
			case 'amber': return 'text-amber-500';
			case 'rose': return 'text-rose-500';
			default: return '';
		}
	}

	function barCls(accent: string): string {
		switch (accent) {
			case 'cyan': return 'bg-primary';
			case 'emerald': return 'bg-emerald-500';
			case 'amber': return 'bg-amber-500';
			case 'rose': return 'bg-rose-500';
			default: return '';
		}
	}

	function valueCls(accent: string): string {
		switch (accent) {
			case 'cyan': return 'text-foreground';
			case 'emerald': return 'text-emerald-400';
			case 'amber': return 'text-amber-400';
			case 'rose': return 'text-rose-400';
			default: return '';
		}
	}
</script>

<div class="space-y-8 stagger-children">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Zap class="w-4 h-4 text-primary" />
				<span class="text-[11px] font-mono uppercase tracking-widest text-primary">Command Center</span>
			</div>
			<h1 class="text-3xl font-bold tracking-tight font-heading">Platform Overview</h1>
			<p class="text-muted-foreground mt-1 text-sm">Real-time metrics and activity across the platform.</p>
		</div>
		<Button variant="outline" size="sm" onclick={() => goto('/admin/merchants')} class="gap-1.5 border-[rgba(30,58,95,0.4)] hover:bg-primary/5 hover:border-primary/30 transition-all">
			<Activity class="w-3.5 h-3.5" />
			View Activity
		</Button>
	</div>

	<!-- Stat Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each statCards as card, i}
			{@const Icon = card.icon}
			<Card class="glass-card relative overflow-hidden group">
				<div class="absolute inset-0 bg-gradient-to-br {card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
				<div class="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity"
					style="background: {card.glow};"
				></div>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
					<CardTitle class="text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">{card.label}</CardTitle>
					<div class="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 {borderCls(card.accent)}">
						<Icon class="w-4 h-4 {textCls(card.accent)}" />
					</div>
				</CardHeader>
				<CardContent class="relative z-10">
					<div class="text-3xl font-bold font-heading tracking-tight {valueCls(card.accent)}">{card.value.toLocaleString()}</div>
					<p class="text-xs text-muted-foreground mt-1 font-mono">{card.sublabel}</p>
					<div class="mt-3 h-1 w-full rounded-full bg-white/5 overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-700 {barCls(card.accent)}"
							style="width: {stats.totalStores > 0 ? (card.value / stats.totalStores) * 100 : 0}%; box-shadow: 0 0 8px {card.glow};"
						></div>
					</div>
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Charts Row -->
	<div class="grid gap-6 lg:grid-cols-7">
		<!-- Recent Signups -->
		<Card class="lg:col-span-4 glass-card">
			<CardHeader class="flex flex-row items-center justify-between pb-4">
				<div>
					<CardTitle class="text-base font-semibold font-heading flex items-center gap-2">
						<span class="h-2 w-2 rounded-full bg-primary"
							style="box-shadow: 0 0 8px rgba(6,182,212,0.6);"
						></span>
						Recent Merchant Signups
					</CardTitle>
					<p class="text-sm text-muted-foreground mt-0.5">Latest stores registered on the platform</p>
				</div>
				<Button variant="outline" size="sm" onclick={() => goto('/admin/merchants')} class="gap-1.5 text-xs border-[rgba(30,58,95,0.4)] hover:bg-primary/5 hover:border-primary/30">
					View All
					<ArrowRight class="h-3 w-3" />
				</Button>
			</CardHeader>
			<CardContent>
				{#if !stats.recentStores || stats.recentStores.length === 0}
					<div class="flex flex-col items-center justify-center py-14 text-center">
						<div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4"
							style="box-shadow: 0 0 24px rgba(6,182,212,0.05);"
						>
							<Store class="h-7 w-7 text-muted-foreground/40" />
						</div>
						<p class="text-muted-foreground font-medium font-heading">No merchants yet</p>
						<p class="text-sm text-muted-foreground/70 mt-1">New registrations will appear here</p>
					</div>
				{:else}
					<div class="space-y-1">
						{#each stats.recentStores as store (store.id)}
							<a href="/admin/merchants/{store.id}" class="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all duration-200 group min-w-0 border border-transparent hover:border-[rgba(30,58,95,0.2)]">
								<div class="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/20 group-hover:ring-primary/40 transition-all"
									style="box-shadow: 0 0 16px rgba(6,182,212,0.08);"
								>
									<span class="text-sm font-bold text-primary font-heading">{store.name?.charAt(0)?.toUpperCase() || 'S'}</span>
								</div>
								<div class="flex-1 min-w-0 overflow-hidden">
									<p class="text-sm font-medium truncate group-hover:text-primary transition-colors">{store.name}</p>
									<p class="text-xs text-muted-foreground truncate font-mono">{store.domain}</p>
								</div>
								<div class="flex items-center gap-3 shrink-0 min-w-0">
									<Badge class="text-[10px] uppercase font-mono tracking-wider border"
										variant={store.status === 'active' ? 'default' : store.status === 'pending' ? 'secondary' : 'destructive'}
									>
										{#if store.status === 'pending'}
											<AlertTriangle class="w-2.5 h-2.5 mr-1" />
										{/if}
										{store.status}
									</Badge>
									<span class="text-xs text-muted-foreground whitespace-nowrap font-mono">{formatDate(store.createdAt)}</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Status Distribution -->
		<Card class="lg:col-span-3 glass-card">
			<CardHeader class="pb-4">
				<CardTitle class="text-base font-semibold font-heading flex items-center gap-2">
					<Activity class="w-4 h-4 text-primary" />
					Store Status Distribution
				</CardTitle>
				<p class="text-sm text-muted-foreground mt-0.5">Breakdown by account status</p>
			</CardHeader>
			<CardContent class="space-y-6">
				{#if stats.totalStores === 0}
					<div class="flex flex-col items-center justify-center py-14 text-center">
						<div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4"
							style="box-shadow: 0 0 24px rgba(6,182,212,0.05);"
						>
							<Activity class="h-7 w-7 text-muted-foreground/40" />
						</div>
						<p class="text-muted-foreground font-medium font-heading">No data yet</p>
						<p class="text-sm text-muted-foreground/70 mt-1">Status distribution will appear here</p>
					</div>
				{:else}
					{#each statusConfig as status}
						{@const count = stats[status.key + 'Stores'] || 0}
						{@const pct = stats.totalStores > 0 ? Math.round((count / stats.totalStores) * 100) : 0}
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="h-2 w-2 rounded-full {status.color}"
										style="box-shadow: 0 0 6px {status.glow};"
									></span>
									<span class="text-sm font-medium">{status.label}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-bold font-data">{count}</span>
									<span class="text-xs text-muted-foreground font-mono">{pct}%</span>
								</div>
							</div>
							<div class="h-2 w-full rounded-full bg-white/5 overflow-hidden">
								<div
									class="h-full rounded-full {status.color} transition-all duration-700 ease-out"
									style="width: {pct}%; box-shadow: 0 0 8px {status.glow};"
								></div>
							</div>
						</div>
					{/each}

					<Separator class="bg-[rgba(30,58,95,0.3)] my-4" />

					<div class="flex items-center justify-between py-1">
						<div class="flex items-center gap-2">
							<CreditCard class="h-4 w-4 text-muted-foreground" />
							<span class="text-sm font-medium">Subscription Plans</span>
						</div>
						<span class="text-xl font-bold font-heading font-data">{stats.totalPlans}</span>
					</div>
					<div class="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
						<div class="h-full rounded-full bg-gradient-to-r from-primary to-accent w-3/4"
							style="box-shadow: 0 0 8px rgba(6,182,212,0.3);"
						></div>
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
