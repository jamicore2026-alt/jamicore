<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types.js';
	import type { Writable } from 'svelte/store';
	import type { emailSchema } from '@repo/shared-types';
	import type { z } from 'zod';
	import type { ValidationErrors } from 'sveltekit-superforms';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	type EmailForm = z.infer<typeof emailSchema>;

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	const sf = superForm(data.form, {
		delayMs: 300,
		dataType: 'form',
	});

	const form = sf.form as Writable<EmailForm>;
	const errors = sf.errors as Writable<ValidationErrors<EmailForm>>;
	const enhance = sf.enhance;
	const enhancing = sf.submitting;
</script>

<div class="w-full max-w-md">
	{#if data.success}
		<Card>
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl text-center">Check Your Email</CardTitle>
				<CardDescription class="text-center">
					If an account exists with that email, you will receive a password reset link shortly.
				</CardDescription>
			</CardHeader>
			<CardContent class="flex justify-center">
				<a href="/login" class="text-sm text-primary hover:underline">
					Back to sign in
				</a>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl text-center">Forgot Password</CardTitle>
				<CardDescription class="text-center">
					Enter your email and we will send you a reset link
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" use:enhance class="space-y-4">
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={$form.email}
							aria-invalid={$errors.email ? 'true' : undefined}
						/>
						{#if $errors.email}
							<p class="text-sm text-destructive">{$errors.email}</p>
						{/if}
					</div>

					<Button type="submit" class="w-full" disabled={$enhancing}>
						{#if $enhancing}
							Sending...
						{:else}
							Send Reset Link
						{/if}
					</Button>
				</form>
			</CardContent>
			<CardFooter class="flex justify-center">
				<a href="/login" class="text-sm text-muted-foreground hover:text-primary underline">
					Back to sign in
				</a>
			</CardFooter>
		</Card>
	{/if}
</div>