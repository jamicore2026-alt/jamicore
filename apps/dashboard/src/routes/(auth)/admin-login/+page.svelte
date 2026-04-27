<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types.js';
	import type { Writable } from 'svelte/store';
	import type { loginSchema } from '@repo/shared-types';
	import type { z } from 'zod';
	import type { ValidationErrors } from 'sveltekit-superforms';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	type LoginForm = z.infer<typeof loginSchema>;

	let { data }: { data: PageData } = $props();

	const sf = superForm(data.form, {
		delayMs: 300,
		dataType: 'form',
	});

	const form = sf.form as Writable<LoginForm>;
	const errors = sf.errors as Writable<ValidationErrors<LoginForm>>;
	const enhance = sf.enhance;
	const enhancing = sf.submitting;
</script>

<svelte:head>
	<title>Sign In</title>
</svelte:head>

<div class="w-full max-w-md">
	<Card>
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl text-center">Super Admin</CardTitle>
			<CardDescription class="text-center">
				Sign in to the platform administration portal
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						name="email"
						placeholder="admin@platform.com"
						bind:value={$form.email}
						aria-invalid={$errors.email ? 'true' : undefined}
					/>
					{#if $errors.email}
						<p class="text-sm text-destructive">{$errors.email}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						type="password"
						name="password"
						placeholder="Enter your password"
						bind:value={$form.password}
						aria-invalid={$errors.password ? 'true' : undefined}
					/>
					{#if $errors.password}
						<p class="text-sm text-destructive">{$errors.password}</p>
					{/if}
				</div>

				<Button type="submit" class="w-full" disabled={$enhancing}>
					{#if $enhancing}
						Signing in...
					{:else}
						Sign In
					{/if}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="flex justify-center">
			<a href="/login" class="text-sm text-muted-foreground hover:text-primary underline">
				Merchant sign in
			</a>
		</CardFooter>
	</Card>
</div>