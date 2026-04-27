<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import type { PageData } from './$types.js';
  import type { Writable } from 'svelte/store';
  import type { loginSchema } from '@repo/shared-types';
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

  type LoginForm = z.infer<typeof loginSchema>;

  let { data }: { data: PageData } = $props();

  const sf = superForm(data.form, {
    delayMs: 300,
    dataType: 'form',
  });

  const form = sf.form as Writable<LoginForm>;
  const errors = sf.errors as Writable<ValidationErrors<LoginForm>>;
  const enhance = sf.enhance;
  const message = sf.message;
</script>

<svelte:head>
  <title>Sign In</title>
</svelte:head>

<Card>
  <CardHeader class="text-center">
    <CardTitle class="text-2xl">Sign In</CardTitle>
    <CardDescription>Enter your credentials to access your account</CardDescription>
  </CardHeader>

  <CardContent>
    {#if data.message}
      <div class="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
        {data.message}
      </div>
    {/if}

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

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium leading-none">Password</label>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Enter your password"
          bind:value={$form.password}
          aria-invalid={$errors.password ? 'true' : undefined}
        />
        {#if $errors.password}
          <p class="text-sm font-medium text-destructive">{$errors.password}</p>
        {/if}
      </div>

      <Button type="submit" class="w-full">Sign In</Button>
    </form>
  </CardContent>

  <CardFooter class="flex-col gap-2">
    <p class="text-sm text-muted-foreground">
      Don't have an account?
      <a href="/register" class="font-medium text-primary hover:underline">Sign up</a>
    </p>
    <a href="/forgot-password" class="text-sm text-muted-foreground hover:text-foreground hover:underline">
      Forgot your password?
    </a>
  </CardFooter>
</Card>