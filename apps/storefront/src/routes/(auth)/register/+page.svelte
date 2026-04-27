<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import type { PageData } from './$types.js';
  import type { Writable } from 'svelte/store';
  import type { customerRegisterSchema } from '@repo/shared-types';
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

  type RegisterForm = z.infer<typeof customerRegisterSchema>;

  let { data }: { data: PageData } = $props();

  const sf = superForm(data.form, {
    delayMs: 300,
    dataType: 'form',
  });

  const form = sf.form as Writable<RegisterForm>;
  const errors = sf.errors as Writable<ValidationErrors<RegisterForm>>;
  const enhance = sf.enhance;
  const message = sf.message;
</script>

<svelte:head>
  <title>Sign Up</title>
</svelte:head>

<Card>
  <CardHeader class="text-center">
    <CardTitle class="text-2xl">Create Account</CardTitle>
    <CardDescription>Enter your details to get started</CardDescription>
  </CardHeader>

  <CardContent>
    {#if $message}
      <div class="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
        {$message}
      </div>
    {/if}

    <form method="POST" use:enhance class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="firstName" class="text-sm font-medium leading-none">First Name</label>
          <Input
            id="firstName"
            type="text"
            name="firstName"
            placeholder="John"
            bind:value={$form.firstName}
          />
          {#if $errors.firstName}
            <p class="text-sm font-medium text-destructive">{$errors.firstName}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <label for="lastName" class="text-sm font-medium leading-none">Last Name</label>
          <Input
            id="lastName"
            type="text"
            name="lastName"
            placeholder="Doe"
            bind:value={$form.lastName}
          />
          {#if $errors.lastName}
            <p class="text-sm font-medium text-destructive">{$errors.lastName}</p>
          {/if}
        </div>
      </div>

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
        <label for="phone" class="text-sm font-medium leading-none">Phone</label>
        <Input
          id="phone"
          type="tel"
          name="phone"
          placeholder="+1 (555) 000-0000"
          bind:value={$form.phone}
        />
        {#if $errors.phone}
          <p class="text-sm font-medium text-destructive">{$errors.phone}</p>
        {/if}
      </div>

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium leading-none">Password</label>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Create a password"
          bind:value={$form.password}
          aria-invalid={$errors.password ? 'true' : undefined}
        />
        {#if $errors.password}
          <p class="text-sm font-medium text-destructive">{$errors.password}</p>
        {/if}
      </div>

      <Button type="submit" class="w-full">Create Account</Button>
    </form>
  </CardContent>

  <CardFooter class="justify-center">
    <p class="text-sm text-muted-foreground">
      Already have an account?
      <a href="/login" class="font-medium text-primary hover:underline">Sign in</a>
    </p>
  </CardFooter>
</Card>