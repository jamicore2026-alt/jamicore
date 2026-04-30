<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types.js';
	import type { Writable } from 'svelte/store';
	import type { resetPasswordSchema } from '@repo/shared-types';
	import type { z } from 'zod';
	import type { ValidationErrors } from 'sveltekit-superforms';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	const sf = superForm(data.form, {
		delayMs: 300,
		dataType: 'form',
	});

	const form = sf.form as Writable<ResetPasswordForm>;
	const errors = sf.errors as Writable<ValidationErrors<ResetPasswordForm>>;
	const enhance = sf.enhance;
	const enhancing = sf.submitting;
</script>

<div class="w-full max-w-md">
	<Card>
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl text-center">Reset Password</CardTitle>
			<CardDescription class="text-center">
				Enter your new password below
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="space-y-4">
				<input type="hidden" bind:value={$form.token} name="token" />

				<div class="space-y-2">
					<Label for="password">New Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="At least 8 characters"
						bind:value={$form.password}
						aria-invalid={$errors.password ? 'true' : undefined}
					/>
					{#if $errors.password}
						<p class="text-sm text-destructive">{$errors.password}</p>
					{/if}
					<p class="text-xs text-muted-foreground">
						Must contain uppercase, lowercase, and a digit
					</p>
				</div>

				<Button type="submit" class="w-full" disabled={$enhancing}>
					{#if $enhancing}
						Resetting...
					{:else}
						Reset Password
					{/if}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>