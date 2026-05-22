<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import type { PageData } from './$types.js';
  import type { Writable } from 'svelte/store';
  import type { verifyMfaSchema } from '@repo/shared-types';
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

  type VerifyMfaForm = z.infer<typeof verifyMfaSchema>;

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	const sf = superForm(data.form, {
    delayMs: 300,
    dataType: 'form',
  });

  const form = sf.form as Writable<VerifyMfaForm>;
  const errors = sf.errors as Writable<ValidationErrors<VerifyMfaForm>>;
  const enhance = sf.enhance;
  const enhancing = sf.submitting;
</script>

<svelte:head>
  <title>Verify Identity</title>
</svelte:head>

<Card>
  <CardHeader class="text-center">
    <CardTitle class="text-2xl">Two-Factor Authentication</CardTitle>
    <CardDescription>Enter the 6-digit code sent to your email</CardDescription>
  </CardHeader>

  <CardContent>
    <form method="POST" use:enhance class="space-y-4">
      <div class="space-y-2">
        <label for="code" class="text-sm font-medium leading-none">Verification Code</label>
        <Input
          id="code"
          type="text"
          name="code"
          placeholder="000000"
          maxlength={6}
          inputmode="numeric"
          bind:value={$form.code}
          aria-invalid={$errors.code ? 'true' : undefined}
        />
        {#if $errors.code}
          <p class="text-sm font-medium text-destructive">{$errors.code}</p>
        {/if}
      </div>

      <Button type="submit" class="w-full" disabled={$enhancing}>
        {#if $enhancing}
          Verifying...
        {:else}
          Verify
        {/if}
      </Button>
    </form>
  </CardContent>
</Card>
