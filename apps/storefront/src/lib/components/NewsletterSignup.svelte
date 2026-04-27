<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Mail, CheckCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let loading = $state(false);
	let subscribed = $state(false);

	async function subscribe() {
		if (!email.trim()) {
			toast.error('Please enter your email');
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/v1/public/newsletter/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim() }),
			});
			if (res.ok) {
				subscribed = true;
				toast.success('Subscribed successfully!');
			} else {
				const data = await res.json().catch(() => ({}));
				toast.error(data.message || 'Failed to subscribe');
			}
		} catch {
			toast.error('Failed to subscribe');
		} finally {
			loading = false;
		}
	}
</script>

<div class="w-full max-w-md">
	{#if subscribed}
		<div class="flex items-center gap-2 text-sm text-[var(--color-primary)]">
			<CheckCircle class="size-4" />
			<span>Thanks for subscribing!</span>
		</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); subscribe(); }} class="flex gap-2">
			<div class="relative flex-1">
				<Mail class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-secondary)]" />
				<Input
					bind:value={email}
					type="email"
					placeholder="Enter your email"
					class="pl-10 bg-[var(--color-bg)] border-[var(--color-border)]"
					onkeydown={(e) => e.key === 'Enter' && subscribe()}
				/>
			</div>
			<Button type="submit" disabled={loading}>
				{loading ? '...' : 'Subscribe'}
			</Button>
		</form>
	{/if}
</div>
