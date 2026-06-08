<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import Globe from '@lucide/svelte/icons/globe';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Copy from '@lucide/svelte/icons/copy';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';

	let { data } = $props();

	interface CustomDomain {
		id: string;
		domain: string;
		status: 'pending' | 'live' | 'failed';
		verificationType: 'CNAME' | 'TXT';
		verificationValue: string;
		dnsName: string;
		dnsValue: string;
		progress: 'dns' | 'ssl' | 'live';
	}

	interface DomainData {
		subdomain: string;
		customDomains: CustomDomain[];
	}

	// svelte-ignore state_referenced_locally
	let domains: DomainData | null = $derived(data.domains);

	// Subdomain state
	let subdomain = $state(domains?.subdomain || '');
	let originalSubdomain = $state(domains?.subdomain || '');
	let subdomainStatus = $state<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
	let subdomainSaving = $state(false);
	let checkTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	function checkAvailability(value: string) {
		if (checkTimer) clearTimeout(checkTimer);
		if (!value.trim() || value === originalSubdomain) {
			subdomainStatus = 'idle';
			return;
		}
		subdomainStatus = 'checking';
		checkTimer = setTimeout(async () => {
			try {
				const res = await apiFetch<{ available: boolean }>(`/merchant/domains/check?domain=${encodeURIComponent(value)}`);
				subdomainStatus = res.available ? 'available' : 'taken';
			} catch {
				subdomainStatus = 'error';
			}
		}, 500);
	}

	function handleSubdomainInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		subdomain = value;
		checkAvailability(value);
	}

	async function saveSubdomain() {
		if (!subdomain.trim() || subdomainSaving) return;
		subdomainSaving = true;
		try {
			await apiFetch('/merchant/domains/subdomain', {
				method: 'PATCH',
				body: JSON.stringify({ subdomain }),
			});
			toast.success('Subdomain updated');
			originalSubdomain = subdomain;
			subdomainStatus = 'idle';
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to update subdomain');
		} finally {
			subdomainSaving = false;
		}
	}

	// Custom domains state
	let customDomains = $derived(domains?.customDomains ?? []);
	let showAddDialog = $state(false);
	let addDomainSaving = $state(false);
	let dnsExpanded = $state<Record<string, boolean>>({});
	let setupGuideExpanded = $state(false);

	let addForm = $state({ domain: '', verificationType: 'CNAME' as 'CNAME' | 'TXT' });

	function openAddDialog() {
		addForm = { domain: '', verificationType: 'CNAME' };
		showAddDialog = true;
	}

	async function addCustomDomain() {
		if (!addForm.domain.trim()) { toast.error('Domain is required'); return; }
		addDomainSaving = true;
		try {
			await apiFetch('/merchant/domains/custom', {
				method: 'POST',
				body: JSON.stringify(addForm),
			});
			toast.success('Custom domain added');
			showAddDialog = false;
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to add domain');
		} finally {
			addDomainSaving = false;
		}
	}

	async function removeCustomDomain(id: string) {
		if (!confirm('Remove this custom domain? This action cannot be undone.')) return;
		try {
			await apiFetch(`/merchant/domains/custom/${id}`, { method: 'DELETE' });
			toast.success('Domain removed');
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to remove domain');
		}
	}

	async function verifyDomain(id: string) {
		try {
			await apiFetch(`/merchant/domains/custom/${id}/verify`, { method: 'POST' });
			toast.success('Verification triggered');
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Verification failed');
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => toast.error('Failed to copy'));
	}

	function copyDnsInfo(d: CustomDomain) {
		const lines = [
			`Type: ${d.dnsName.includes('TXT') ? 'TXT' : 'CNAME'}`,
			`Name: ${d.dnsName}`,
			`Value: ${d.dnsValue}`,
		];
		copyToClipboard(lines.join('\n'));
	}

	function toggleDns(id: string) {
		dnsExpanded = { ...dnsExpanded, [id]: !dnsExpanded[id] };
	}

	function statusBadgeVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
		if (status === 'live') return 'default';
		if (status === 'failed') return 'destructive';
		return 'outline';
	}

	function progressLabel(step: string): string {
		if (step === 'dns') return 'DNS Verification';
		if (step === 'ssl') return 'SSL Provisioning';
		return 'Live';
	}

	function progressClass(done: boolean, active: boolean, pending: boolean): string {
		let cls = done
			? 'text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium'
			: 'text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground';
		if (active && pending) cls += ' animate-pulse';
		return cls;
	}

	const progressSteps = ['dns', 'ssl', 'live'] as const;
</script>

<div class="space-y-6 max-w-3xl">
	<!-- Section 1: Primary Subdomain -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"><Globe class="w-5 h-5" />Primary Subdomain</CardTitle>
			<CardDescription>Your store is accessible at this subdomain</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
				<span class="font-mono">https://</span>
				<span class="font-mono font-medium text-foreground">{originalSubdomain || '...'}</span>
				<span class="font-mono">.jamicore.com</span>
			</div>
			<div class="space-y-2">
				<Label for="subdomain">Customize subdomain</Label>
				<div class="flex gap-2">
					<div class="relative flex-1">
						<Input
							id="subdomain"
							value={subdomain}
							oninput={handleSubdomainInput}
							placeholder="your-store"
						/>
						<div class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
							{#if subdomainStatus === 'checking'}
								<span class="text-xs text-muted-foreground animate-pulse">Checking...</span>
							{:else if subdomainStatus === 'available'}
								<span class="text-xs text-green-600 flex items-center gap-1"><Check class="w-3 h-3" /> Available</span>
							{:else if subdomainStatus === 'taken'}
								<span class="text-xs text-destructive flex items-center gap-1"><X class="w-3 h-3" /> Taken</span>
							{:else if subdomainStatus === 'error'}
								<span class="text-xs text-destructive">Check failed</span>
							{/if}
						</div>
					</div>
					<Button
						onclick={saveSubdomain}
						disabled={subdomainSaving || subdomainStatus === 'idle' || subdomainStatus === 'taken' || subdomainStatus === 'checking'}
					>
						{subdomainSaving ? 'Saving...' : 'Save'}
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					Only lowercase letters, numbers, and hyphens. 3-63 characters.
				</p>
			</div>
		</CardContent>
	</Card>

	<!-- Section 2: Custom Domains -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between">
			<div>
				<CardTitle>Custom Domains</CardTitle>
				<CardDescription>Connect your own domain to your store</CardDescription>
			</div>
			<Button onclick={openAddDialog} size="sm" class="gap-2"><Plus class="w-4 h-4" />Add Domain</Button>
		</CardHeader>
		<CardContent class="p-0">
			{#if customDomains.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>No custom domains configured</p>
					<Button onclick={openAddDialog} class="mt-3 gap-2" size="sm"><Plus class="w-4 h-4" />Add Domain</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Domain</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head>Progress</Table.Head>
							<Table.Head class="text-right w-40">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each customDomains as d (d.id)}
							<Table.Row>
								<Table.Cell class="font-medium font-mono">{d.domain}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge variant={statusBadgeVariant(d.status)}>
										{d.status === 'live' ? 'Live' : d.status === 'failed' ? 'Failed' : 'Pending'}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-1.5">
										{#each progressSteps as step, i}
											{@const done = d.progress === 'live' || (d.progress === 'ssl' && (step === 'dns' || step === 'ssl')) || (d.progress === 'dns' && step === 'dns')}
											{@const active = d.progress === step}
											{@const pCls = progressClass(done, active, d.status === 'pending')}
											<span class={pCls}>
												{progressLabel(step)}
											</span>
											{#if i < progressSteps.length - 1}
												<span class="text-muted-foreground/40">&#8594;</span>
											{/if}
										{/each}
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										{#if d.status === 'pending'}
											<button
												onclick={() => toggleDns(d.id)}
												class="p-1.5 rounded hover:bg-muted"
												title="DNS Instructions"
											>
												{#if dnsExpanded[d.id]}
													<ChevronUp class="w-4 h-4 text-muted-foreground" />
												{:else}
													<ChevronDown class="w-4 h-4 text-muted-foreground" />
												{/if}
											</button>
											<button
												onclick={() => verifyDomain(d.id)}
												class="p-1.5 rounded hover:bg-muted"
												title="Verify Now"
											>
												<RefreshCw class="w-4 h-4 text-muted-foreground" />
											</button>
										{/if}
										<button
											onclick={() => removeCustomDomain(d.id)}
											class="p-1.5 rounded hover:bg-destructive/10"
											title="Remove"
										>
											<Trash2 class="w-4 h-4 text-destructive" />
										</button>
									</div>
								</Table.Cell>
							</Table.Row>
							{#if dnsExpanded[d.id]}
								<Table.Row class="bg-muted/30">
									<Table.Cell colspan={4}>
										<div class="space-y-2 py-2">
											<div class="flex items-center justify-between">
												<span class="text-sm font-medium">DNS Record Instructions</span>
												<Button variant="outline" size="sm" class="gap-1.5" onclick={() => copyDnsInfo(d)}>
													<Copy class="w-3 h-3" />Copy All
												</Button>
											</div>
											<div class="grid grid-cols-2 gap-2 text-sm">
												<div>
													<span class="text-muted-foreground">Type:</span>
													<span class="ml-2 font-mono font-medium">{d.dnsName.includes('TXT') ? 'TXT' : 'CNAME'}</span>
												</div>
												<div>
													<span class="text-muted-foreground">Name/Host:</span>
													<span class="ml-2 font-mono">{d.dnsName}</span>
												</div>
												<div class="col-span-2">
													<span class="text-muted-foreground">Value/Points to:</span>
													<span class="ml-2 font-mono break-all">{d.dnsValue}</span>
												</div>
											</div>
											<p class="text-xs text-muted-foreground">
												Add this record in your DNS provider's control panel. Changes may take up to 48 hours to propagate.
											</p>
										</div>
									</Table.Cell>
								</Table.Row>
							{/if}
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</CardContent>
	</Card>

	<!-- Section 3: Setup Guide -->
	{#if customDomains.length > 0}
		<Card>
			<button
				class="w-full text-left"
				onclick={() => setupGuideExpanded = !setupGuideExpanded}
			>
				<CardHeader class="flex flex-row items-center justify-between cursor-pointer">
					<div>
						<CardTitle>Setup Guide</CardTitle>
						<CardDescription>How to connect your custom domain</CardDescription>
					</div>
					{#if setupGuideExpanded}
						<ChevronUp class="w-5 h-5 text-muted-foreground" />
					{:else}
						<ChevronDown class="w-5 h-5 text-muted-foreground" />
					{/if}
				</CardHeader>
			</button>
			{#if setupGuideExpanded}
				<CardContent>
					<ol class="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
						<li>
							<span class="font-medium text-foreground">Add your domain</span>
							&mdash; Enter your domain (e.g. store.example.com) and choose CNAME or TXT verification.
						</li>
						<li>
							<span class="font-medium text-foreground">Configure DNS</span>
							&mdash; Copy the DNS record shown above and add it in your DNS provider (Cloudflare, Namecheap, etc.).
						</li>
						<li>
							<span class="font-medium text-foreground">Verify</span>
							&mdash; Click "Verify Now". DNS propagation can take from a few minutes to 48 hours.
						</li>
						<li>
							<span class="font-medium text-foreground">SSL Provisioning</span>
							&mdash; Once verified, an SSL certificate will be automatically provisioned (usually within 5-15 minutes).
						</li>
						<li>
							<span class="font-medium text-foreground">Go Live</span>
							&mdash; Your custom domain is now active and serving your store over HTTPS.
						</li>
					</ol>
					<div class="mt-4 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
						<p><strong>CNAME verification:</strong> Point your subdomain to our servers. Best for entire storefront domains.</p>
						<p class="mt-1"><strong>TXT verification:</strong> Add a TXT record to prove ownership. Useful when the domain already points elsewhere.</p>
					</div>
				</CardContent>
			{/if}
		</Card>
	{/if}
</div>

<!-- Add Domain Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header><Dialog.Title>Add Custom Domain</Dialog.Title></Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); addCustomDomain(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="customDomain">Domain *</Label>
				<Input id="customDomain" bind:value={addForm.domain} placeholder="store.example.com" required />
				<p class="text-xs text-muted-foreground">Enter your full domain (e.g. shop.yourbrand.com)</p>
			</div>
			<div class="space-y-2">
				<Label>Verification Method</Label>
				<div class="flex gap-4">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="verificationType"
							value="CNAME"
							bind:group={addForm.verificationType}
							class="text-primary"
						/>
						<span class="text-sm">CNAME</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="verificationType"
							value="TXT"
							bind:group={addForm.verificationType}
							class="text-primary"
						/>
						<span class="text-sm">TXT</span>
					</label>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => showAddDialog = false}>Cancel</Button>
				<Button type="submit" disabled={addDomainSaving}>
					{addDomainSaving ? 'Adding...' : 'Add Domain'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
