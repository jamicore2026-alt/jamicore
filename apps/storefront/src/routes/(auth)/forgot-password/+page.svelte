<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import type { PageData } from './$types.js';
  import type { Writable } from 'svelte/store';
  import type { emailSchema } from '@repo/shared-types';
  import type { z } from 'zod';
  import type { ValidationErrors } from 'sveltekit-superforms';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
  } from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

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
  const message = sf.message;

  let submitted = $derived(data.submitted ?? false);

  const isSubmitted = $derived(
    submitted ||
    ($message !== undefined && $message !== null && String($message).includes('reset link'))
  );
</script>

<Card>
  <CardHeader class="text-center">
    <CardTitle class="text-2xl">Forgot Password</CardTitle>
    <CardDescription>Enter your email to receive a password reset link</CardDescription>
  </CardHeader>

  <CardContent>
    {#if isSubmitted}
      <div class="rounded-lg border border-success/30 bg-success/10 p-4 text-center">
        <p class="text-sm font-medium text-success">Check your email</p>
        <p class="mt-1 text-sm text-muted-foreground">
          If an account exists with that email, you will receive a password reset link shortly.
        </p>
        <a href="/login" class="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Back to sign in
        </a>
      </div>
    {:else}
      {#if $message}
        <div class="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
          {$message}
        </div>
      {/if}

      <form method="POST" use:enhance class="space-y-4">
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium leading-none">Email</label>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            bind:value={$form.email}
            aria-invalid={$errors.email ? 'true' : undefined}
          />
          {#if $errors.email}
            <p class="text-sm font-medium text-destructive">{$errors.email}</p>
          {/if}
        </div>

        <Button type="submit" class="w-full">Send Reset Link</Button>
      </form>
    {/if}
  </CardContent>

  {#if !isSubmitted}
    <CardFooter class="justify-center">
      <a href="/login" class="text-sm text-muted-foreground hover:text-foreground hover:underline">
        Back to sign in
      </a>
    </CardFooter>
  {/if}
</Card>