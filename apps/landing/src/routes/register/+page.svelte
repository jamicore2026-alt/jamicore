<script lang="ts">
  import { env } from '$lib/config/env.js';
  import { goto } from '$app/navigation';
  import { Store, Mail, User, Phone, Lock, ArrowRight, CheckCircle, AlertCircle } from '@lucide/svelte';

  let storeName = $state('');
  let domain = $state('');
  let ownerEmail = $state('');
  let ownerName = $state('');
  let ownerPhone = $state('');
  let password = $state('');
  let confirmPassword = $state('');

  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  function validate(): string | null {
    if (!storeName.trim()) return 'Store name is required';
    if (!domain.trim()) return 'Domain is required';
    if (!ownerEmail.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return 'Invalid email address';
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain uppercase, lowercase, and number';
    }
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';

    const validationError = validate();
    if (validationError) {
      error = validationError;
      return;
    }

    loading = true;
    try {
      const res = await fetch(`${env.API_BASE_URL}/api/v1/merchant/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          domain: domain.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerName: ownerName.trim() || undefined,
          ownerPhone: ownerPhone.trim() || undefined,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        error = data.message || data.error || `Registration failed (${res.status})`;
        return;
      }

      success = true;
      setTimeout(() => goto('/'), 2000);
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Register — jamicore</title>
  <meta name="description" content="Create your jamicore merchant account in minutes. Start selling online today." />
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-20 sm:px-6 lg:px-8">
  <div class="text-center">
    <h1 class="text-3xl font-bold tracking-tight text-foreground">Create Your Store</h1>
    <p class="mt-2 text-muted-foreground">
      Get started with jamicore in under 2 minutes. No credit card required.
    </p>
  </div>

  {#if success}
    <div class="mt-8 rounded-xl border border-success/30 bg-success/10 p-6 text-center">
      <CheckCircle class="mx-auto h-10 w-10 text-success" />
      <h2 class="mt-4 text-lg font-semibold text-foreground">Account Created!</h2>
      <p class="mt-2 text-muted-foreground">
        Welcome to jamicore. Redirecting you to the dashboard...
      </p>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="mt-8 space-y-5">
      {#if error}
        <div class="flex items-start gap-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span class="text-sm text-error">{error}</span>
        </div>
      {/if}

      <div class="space-y-1.5">
        <label for="storeName" class="text-sm font-medium text-foreground">Store Name *</label>
        <div class="relative">
          <Store class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="storeName"
            type="text"
            bind:value={storeName}
            placeholder="My Awesome Store"
            class="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="domain" class="text-sm font-medium text-foreground">Domain *</label>
        <div class="relative">
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="my-store"
            class="w-full rounded-md border border-border bg-background py-2.5 pl-3 pr-20 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">.jamicore.com</span>
        </div>
        <p class="text-xs text-muted-foreground">This will be your store URL.</p>
      </div>

      <div class="space-y-1.5">
        <label for="ownerEmail" class="text-sm font-medium text-foreground">Email *</label>
        <div class="relative">
          <Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="ownerEmail"
            type="email"
            bind:value={ownerEmail}
            placeholder="you@example.com"
            class="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="ownerName" class="text-sm font-medium text-foreground">Full Name</label>
          <div class="relative">
            <User class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="ownerName"
              type="text"
              bind:value={ownerName}
              placeholder="John Doe"
              class="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="ownerPhone" class="text-sm font-medium text-foreground">Phone</label>
          <div class="relative">
            <Phone class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="ownerPhone"
              type="tel"
              bind:value={ownerPhone}
              placeholder="+91 98765 43210"
              class="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-medium text-foreground">Password *</label>
        <div class="relative">
          <Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Min 8 chars, upper, lower, number"
            class="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="text-sm font-medium text-foreground">Confirm Password *</label>
        <div class="relative">
          <Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Repeat password"
            class="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-60"
      >
        {#if loading}
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent"></span>
          Creating account...
        {:else}
          Create Account
          <ArrowRight class="h-4 w-4" />
        {/if}
      </button>

      <p class="text-center text-sm text-muted-foreground">
        Already have an account?
        <a href="/" class="font-medium text-accent hover:underline">Sign in</a>
      </p>
    </form>
  {/if}
</div>
