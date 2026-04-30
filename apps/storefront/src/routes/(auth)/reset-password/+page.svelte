<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import type { PageData } from './$types.js';
  import type { Writable } from 'svelte/store';
  import type { resetPasswordSchema } from '@repo/shared-types';
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
  import { Label } from '$lib/components/ui/label/index.js';

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
  const message = sf.message;

  let confirmPassword = $state('');

  // Pre-fill the token from the URL query parameter
  $effect(() => {
    if (data.token && $form.token !== data.token) {
      $form.token = data.token;
    }
  });

  let passwordsMatch = $derived(
    !$form.password || !confirmPassword || $form.password === confirmPassword
  );
</script>

<Card>
  <CardHeader class="text-center">
    <CardTitle class="text-2xl">Reset Password</CardTitle>
    <CardDescription>Enter your new password below</CardDescription>
  </CardHeader>

  <CardContent>
    {#if $message}
      <div class="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
        {$message}
      </div>
    {/if}

    {#if !passwordsMatch}
      <div class="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
        Passwords do not match
      </div>
    {/if}

    <form method="POST" use:enhance class="space-y-4">
      <input type="hidden" name="token" value={$form.token} />

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium leading-none">New Password</label>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Enter new password"
          bind:value={$form.password}
          aria-invalid={$errors.password ? 'true' : undefined}
        />
        {#if $errors.password}
          <p class="text-sm font-medium text-destructive">{$errors.password}</p>
        {/if}
      </div>

      <div class="space-y-2">
        <Label for="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Confirm new password"
          bind:value={confirmPassword}
        />
      </div>

      <Button type="submit" class="w-full" disabled={!passwordsMatch}>Reset Password</Button>
    </form>
  </CardContent>

  <CardFooter class="justify-center">
    <a href="/login" class="text-sm text-muted-foreground hover:text-foreground hover:underline">
      Back to sign in
    </a>
  </CardFooter>
</Card>