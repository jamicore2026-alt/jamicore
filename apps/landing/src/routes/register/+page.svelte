<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    Store,
    Mail,
    User,
    Phone,
    Lock,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    Sparkles,
  } from '@lucide/svelte';

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
      const res = await fetch('/api/v1/merchant/auth/register', {
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
  <meta
    name="description"
    content="Create your jamicore merchant account in minutes. Start selling online today."
  />
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-10 text-center">
    <div
      class="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-medium text-accent"
    >
      <Sparkles class="h-3.5 w-3.5" />
      Free forever. No credit card required.
    </div>
    <h1 class="font-serif text-4xl font-light text-foreground">Create Your Store</h1>
    <p class="mt-2 text-muted-foreground">Get started with jamicore in under two minutes.</p>
  </div>

  {#if success}
    <div class="rounded-2xl border border-success/20 bg-success/10 p-8 text-center">
      <CheckCircle class="mx-auto h-10 w-10 text-success" />
      <h2 class="mt-4 font-serif text-xl font-medium text-foreground">Welcome aboard</h2>
      <p class="mt-2 text-sm text-muted-foreground">Redirecting to your dashboard...</p>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if error}
        <div class="flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span class="text-sm text-error">{error}</span>
        </div>
      {/if}

      <div class="space-y-1.5">
        <label for="storeName" class="text-sm font-medium text-foreground">Store Name *</label>
        <div class="relative">
          <Store class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="storeName"
            type="text"
            bind:value={storeName}
            placeholder="My Awesome Store"
            class="w-full rounded-xl border border-border/50 bg-card/40 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
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
            class="w-full rounded-xl border border-border/50 bg-card/40 py-3 pl-4 pr-24 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">.jamicore.com</span>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="ownerEmail" class="text-sm font-medium text-foreground">Email *</label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="ownerEmail"
            type="email"
            bind:value={ownerEmail}
            placeholder="you@example.com"
            class="w-full rounded-xl border border-border/50 bg-card/40 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="ownerName" class="text-sm font-medium text-foreground">Full Name</label>
          <div class="relative">
            <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="ownerName"
              type="text"
              bind:value={ownerName}
              placeholder="John Doe"
              class="w-full rounded-xl border border-border/50 bg-card/40 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="ownerPhone" class="text-sm font-medium text-foreground">Phone</label>
          <div class="relative">
            <Phone class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="ownerPhone"
              type="tel"
              bind:value={ownerPhone}
              placeholder="+91 98765 43210"
              class="w-full rounded-xl border border-border/50 bg-card/40 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-medium text-foreground">Password *</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Min 8 chars, upper, lower, number"
            class="w-full rounded-xl border border-border/50 bg-card/40 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="text-sm font-medium text-foreground">Confirm Password *</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Repeat password"
            class="w-full rounded-xl border border-border/50 bg-card/40 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent/20 transition-all hover:shadow-accent/40 disabled:opacity-60"
      >
        {#if loading}
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></span>
          Creating account...
        {:else}
          Create Account
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        {/if}
      </button>

      <p class="text-center text-sm text-muted-foreground">
        Already have an account?
        <a href="/" class="font-medium text-accent transition-colors hover:text-accent/80">Sign in</a>
      </p>
    </form>
  {/if}
</div>
