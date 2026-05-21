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
      class="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-emerald/5 px-4 py-1.5 text-xs font-semibold text-emerald"
    >
      <Sparkles class="h-3.5 w-3.5" />
      Free forever. No credit card required.
    </div>
    <h1 class="text-4xl font-bold tracking-tight text-navy">Create Your Store</h1>
    <p class="mt-2 text-gray-500">Get started with jamicore in under two minutes.</p>
  </div>

  {#if success}
    <div class="rounded-xl border border-emerald/20 bg-emerald/5 p-8 text-center">
      <CheckCircle class="mx-auto h-10 w-10 text-emerald" />
      <h2 class="mt-4 text-xl font-semibold text-navy">Welcome aboard</h2>
      <p class="mt-2 text-sm text-gray-500">Redirecting to your dashboard...</p>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if error}
        <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span class="text-sm text-red-600">{error}</span>
        </div>
      {/if}

      <div class="space-y-1.5">
        <label for="storeName" class="text-sm font-semibold text-navy">Store Name *</label>
        <div class="relative">
          <Store class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="storeName"
            type="text"
            bind:value={storeName}
            placeholder="My Awesome Store"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="domain" class="text-sm font-semibold text-navy">Domain *</label>
        <div class="relative">
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="my-store"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-4 pr-24 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">.jamicore.com</span>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="ownerEmail" class="text-sm font-semibold text-navy">Email *</label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="ownerEmail"
            type="email"
            bind:value={ownerEmail}
            placeholder="you@example.com"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
          />
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="ownerName" class="text-sm font-semibold text-navy">Full Name</label>
          <div class="relative">
            <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="ownerName"
              type="text"
              bind:value={ownerName}
              placeholder="John Doe"
              class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="ownerPhone" class="text-sm font-semibold text-navy">Phone</label>
          <div class="relative">
            <Phone class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="ownerPhone"
              type="tel"
              bind:value={ownerPhone}
              placeholder="+971 50 123 4567"
              class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
            />
          </div>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-semibold text-navy">Password *</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Min 8 chars, upper, lower, number"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="text-sm font-semibold text-navy">Confirm Password *</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Repeat password"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="group flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3.5 text-sm font-semibold text-white shadow-sm shadow-emerald/20 transition-all hover:bg-emerald-dark disabled:opacity-60"
      >
        {#if loading}
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          Creating account...
        {:else}
          Create Account
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        {/if}
      </button>

      <p class="text-center text-sm text-gray-500">
        Already have an account?
        <a href="/" class="font-semibold text-emerald transition-colors hover:text-emerald-dark">Sign in</a>
      </p>
    </form>
  {/if}
</div>
