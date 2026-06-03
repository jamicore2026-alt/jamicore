<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import Save from '@lucide/svelte/icons/save';
	import Lock from '@lucide/svelte/icons/lock';

	let { data } = $props();

	let saving = $state(false);
	let providers = $state.raw(data.providers || []);

	interface ProviderForm {
		provider: string;
		isEnabled: boolean;
		secretKey?: string;
		publishableKey?: string;
		keyId?: string;
		keySecret?: string;
		webhookSecret?: string;
	}

	let forms = $state<Record<string, ProviderForm>>({
		stripe: {
			provider: 'stripe',
			isEnabled: false,
			secretKey: '',
			publishableKey: '',
			webhookSecret: '',
		},
		razorpay: {
			provider: 'razorpay',
			isEnabled: false,
			keyId: '',
			keySecret: '',
			webhookSecret: '',
		},
		cod: {
			provider: 'cod',
			isEnabled: true,
		},
	});

	// Initialize forms from existing provider data
	$effect(() => {
		for (const p of providers) {
			if (p.provider in forms) {
				forms[p.provider] = {
					...forms[p.provider],
					isEnabled: p.isEnabled,
					...(p.config || {}),
				};
			}
		}
	});

	async function saveProvider(provider: string) {
		saving = true;
		try {
			const form = forms[provider];
			const config: Record<string, string> = {};
			if (provider === 'stripe') {
				if (form.secretKey) config.secret_key = form.secretKey;
				if (form.publishableKey) config.publishable_key = form.publishableKey;
				if (form.webhookSecret) config.webhook_secret = form.webhookSecret;
			}
			if (provider === 'razorpay') {
				if (form.keyId) config.key_id = form.keyId;
				if (form.keySecret) config.key_secret = form.keySecret;
				if (form.webhookSecret) config.webhook_secret = form.webhookSecret;
			}

			await apiFetch('/merchant/payments/providers', {
				method: 'POST',
				body: JSON.stringify({
					provider,
					isEnabled: form.isEnabled,
					config: Object.keys(config).length > 0 ? config : undefined,
				}),
			});
			toast.success(`${provider.toUpperCase()} settings saved`);
			invalidateAll();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to save provider');
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6 max-w-2xl">
	<Card>
		<CardHeader>
			<CardTitle>Cash on Delivery</CardTitle>
			<CardDescription>Accept cash payments on delivery or pickup</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Enable COD</p>
					<p class="text-sm text-muted-foreground">Allow customers to pay with cash</p>
				</div>
				<Switch
					checked={forms.cod.isEnabled}
					onCheckedChange={(v) => { forms.cod.isEnabled = v; saveProvider('cod'); }}
				/>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Lock class="w-4 h-4" /> Stripe
			</CardTitle>
			<CardDescription>Accept card payments via Stripe</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Enable Stripe</p>
					<p class="text-sm text-muted-foreground">Accept credit/debit cards</p>
				</div>
				<Switch bind:checked={forms.stripe.isEnabled} />
			</div>

			{#if forms.stripe.isEnabled}
				<div class="space-y-3 pt-2">
					<div class="space-y-2">
						<Label for="stripe-pk">Publishable Key</Label>
						<Input id="stripe-pk" bind:value={forms.stripe.publishableKey} placeholder="pk_live_..." />
					</div>
					<div class="space-y-2">
						<Label for="stripe-sk">Secret Key</Label>
						<Input id="stripe-sk" type="password" bind:value={forms.stripe.secretKey} placeholder="sk_live_..." />
					</div>
					<div class="space-y-2">
						<Label for="stripe-wh">Webhook Secret</Label>
						<Input id="stripe-wh" type="password" bind:value={forms.stripe.webhookSecret} placeholder="whsec_..." />
						<p class="text-xs text-muted-foreground">Use endpoint: /api/v1/public/payments/webhook/stripe</p>
					</div>
				</div>
			{/if}

			<div class="flex justify-end">
				<Button onclick={() => saveProvider('stripe')} disabled={saving} class="gap-2">
					<Save class="w-4 h-4" />
					{saving ? 'Saving...' : 'Save Stripe'}
				</Button>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Lock class="w-4 h-4" /> Razorpay
			</CardTitle>
			<CardDescription>Accept payments via Razorpay (India)</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Enable Razorpay</p>
					<p class="text-sm text-muted-foreground">Accept UPI, cards, netbanking</p>
				</div>
				<Switch bind:checked={forms.razorpay.isEnabled} />
			</div>

			{#if forms.razorpay.isEnabled}
				<div class="space-y-3 pt-2">
					<div class="space-y-2">
						<Label for="rz-key-id">Key ID</Label>
						<Input id="rz-key-id" bind:value={forms.razorpay.keyId} placeholder="rzp_live_..." />
					</div>
					<div class="space-y-2">
						<Label for="rz-key-secret">Key Secret</Label>
						<Input id="rz-key-secret" type="password" bind:value={forms.razorpay.keySecret} placeholder="Enter key secret" />
					</div>
					<div class="space-y-2">
						<Label for="rz-wh">Webhook Secret</Label>
						<Input id="rz-wh" type="password" bind:value={forms.razorpay.webhookSecret} placeholder="Enter webhook secret" />
						<p class="text-xs text-muted-foreground">Use endpoint: /api/v1/public/payments/webhook/razorpay</p>
					</div>
				</div>
			{/if}

			<div class="flex justify-end">
				<Button onclick={() => saveProvider('razorpay')} disabled={saving} class="gap-2">
					<Save class="w-4 h-4" />
					{saving ? 'Saving...' : 'Save Razorpay'}
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
