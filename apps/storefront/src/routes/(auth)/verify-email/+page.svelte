<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import type { PageData } from './$types.js';
  import type { Writable } from 'svelte/store';
  import type { verifyEmailSchema } from '@repo/shared-types';
  import type { z } from 'zod';
  import type { ValidationErrors } from 'sveltekit-superforms';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
  } from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  type VerifyEmailForm = z.infer<typeof verifyEmailSchema>;

	let { data }: { data: PageData } = $props();

  	// svelte-ignore state_referenced_locally
	const sf = superForm(data.form, {
    delayMs: 300,
    dataType: 'form',
  });

  const form = sf.form as Writable<VerifyEmailForm>;
  const errors = sf.errors as Writable<ValidationErrors<VerifyEmailForm>>;
  const enhance = sf.enhance;
  const message = sf.message;

  // Auto-fill the token from the URL query parameter
  $effect(() => {
    if (data.token && $form.token !== data.token) {
      $form.token = data.token;
    }
  });
</script>

<Card>
  <CardHeader class="text-center">
    <CardTitle class="text-2xl">Verify Your Email</CardTitle>
    <CardDescription>Enter the verification token sent to your email</CardDescription>
  </CardHeader>

  <CardContent>
    {#if $message}
      <div class="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
        {$message}
      </div>
    {/if}

    <form method="POST" use:enhance class="space-y-4">
      <div class="space-y-2">
        <label for="token" class="text-sm font-medium leading-none">Verification Token</label>
        <Input
          id="token"
          type="text"
          name="token"
          placeholder="Paste your token here"
          bind:value={$form.token}
          aria-invalid={$errors.token ? 'true' : undefined}
        />
        {#if $errors.token}
          <p class="text-sm font-medium text-destructive">{$errors.token}</p>
        {/if}
      </div>

      <Button type="submit" class="w-full">Verify Email</Button>
    </form>
  </CardContent>
</Card>