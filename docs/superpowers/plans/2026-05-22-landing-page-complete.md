# Landing Page Complete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 15 missing landing page features (auth pages, legal pages, contact, testimonials, SEO, cookie consent, dark mode, error page, register improvements) with zero copyrighted content.

**Architecture:** Extend existing SvelteKit landing app. New pages follow the same Tailwind v4 + custom theme pattern. Shared components (CookieConsent, dark mode) added to layout. All text written from scratch.

**Tech Stack:** SvelteKit, Tailwind CSS v4, Lucide icons, TypeScript strict

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/landing/src/app.html` | Modify | Add Open Graph, Twitter Card, and canonical base meta tags |
| `apps/landing/src/app.css` | Modify | Add dark mode color variants |
| `apps/landing/src/routes/+error.svelte` | Create | 404 and 500 error page |
| `apps/landing/src/lib/components/CookieConsent.svelte` | Create | GDPR cookie banner |
| `apps/landing/src/lib/components/Navbar.svelte` | Modify | Dark mode toggle, Sign In link |
| `apps/landing/src/lib/components/Footer.svelte` | Modify | Fix dead legal links |
| `apps/landing/src/routes/+layout.svelte` | Modify | Inject CookieConsent, dark mode class on `<html>` |
| `apps/landing/src/routes/login/+page.svelte` | Create | Merchant login form |
| `apps/landing/src/routes/forgot-password/+page.svelte` | Create | Password reset request |
| `apps/landing/src/routes/reset-password/+page.svelte` | Create | Password reset with token |
| `apps/landing/src/routes/privacy/+page.svelte` | Create | Privacy Policy page |
| `apps/landing/src/routes/terms/+page.svelte` | Create | Terms of Service page |
| `apps/landing/src/routes/contact/+page.svelte` | Create | Contact form (frontend only) |
| `apps/landing/src/routes/+page.svelte` | Modify | Add Trusted By, Testimonials, JSON-LD |
| `apps/landing/src/routes/register/+page.svelte` | Modify | Terms checkbox, password strength, MFA handling |
| `apps/landing/src/routes/pricing/+page.svelte` | Modify | OG/Twitter meta tags |
| `apps/landing/src/routes/about/+page.svelte` | Modify | OG/Twitter meta tags |

---

## Task 1: Global — Open Graph Meta Tags in `app.html`

**Files:**
- Modify: `apps/landing/src/app.html`

- [ ] **Step 1: Add OG and Twitter meta base tags**

Replace the `<head>` content in `app.html`:

```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="%sveltekit.assets%/favicon.png" />
  <meta name="theme-color" content="#0A2540" />

  <meta property="og:site_name" content="jamicore" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="%sveltekit.assets%/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@jamicore" />
  <meta name="twitter:image" content="%sveltekit.assets%/og-image.png" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  %sveltekit.head%
</head>
```

- [ ] **Step 2: Verify file is valid HTML**

Run: `pnpm typecheck`
Expected: No errors in landing app

---

## Task 2: Global — Dark Mode Colors in `app.css`

**Files:**
- Modify: `apps/landing/src/app.css`

- [ ] **Step 1: Append dark mode color overrides after existing @theme block**

After the existing `@theme inline { ... }` block (after line 50), add:

```css
@layer base {
  html.dark {
    --color-background: #0B1220;
    --color-foreground: #E2E8F0;
    --color-card: #111827;
    --color-card-foreground: #E2E8F0;
    --color-primary: #E2E8F0;
    --color-primary-foreground: #0B1220;
    --color-secondary: #1E293B;
    --color-secondary-foreground: #E2E8F0;
    --color-muted: #1E293B;
    --color-muted-foreground: #94A3B8;
    --color-border: rgba(148, 163, 184, 0.12);
    --color-input: rgba(148, 163, 184, 0.12);
    --color-ring: #00A86B;
    --color-navy: #E2E8F0;
    --color-navy-light: #CBD5E1;
    --color-gray-50: #0F172A;
    --color-gray-100: #1E293B;
    --color-gray-200: #334155;
    --color-gray-300: #475569;
    --color-gray-400: #64748B;
    --color-gray-500: #94A3B8;
    --color-gray-600: #CBD5E1;
    --color-gray-700: #E2E8F0;
    --color-gray-800: #F1F5F9;
    --color-gray-900: #F8FAFC;
  }

  html.dark ::-webkit-scrollbar-track {
    background: #0F172A;
  }
  html.dark ::-webkit-scrollbar-thumb {
    background: #334155;
  }
  html.dark ::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 3: Error Page (`+error.svelte`)

**Files:**
- Create: `apps/landing/src/routes/+error.svelte`

- [ ] **Step 1: Create the error page**

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { ArrowLeft, Home, AlertTriangle } from '@lucide/svelte';

  const is404 = $derived(page.status === 404);
  const title = $derived(is404 ? 'Page Not Found' : 'Something Went Wrong');
  const message = $derived(
    is404
      ? "The page you're looking for doesn't exist or has been moved."
      : 'An unexpected error occurred. Please try again later.'
  );
</script>

<svelte:head>
  <title>{page.status} — jamicore</title>
  <meta name="description" content={title} />
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8">
  <div class="mb-6 inline-flex rounded-full bg-emerald/10 p-4">
    <AlertTriangle class="h-8 w-8 text-emerald" />
  </div>

  <h1 class="text-7xl font-extrabold tracking-tight text-navy">{page.status}</h1>
  <h2 class="mt-4 text-2xl font-semibold text-navy">{title}</h2>
  <p class="mt-2 text-gray-500">{message}</p>

  <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
    <a
      href="/"
      class="inline-flex items-center gap-2 rounded-lg bg-emerald px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald/20 transition-all hover:bg-emerald-dark"
    >
      <Home class="h-4 w-4" />
      Back to Home
    </a>
    <button
      onclick={() => history.back()}
      class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-emerald/30 hover:bg-emerald/5"
    >
      <ArrowLeft class="h-4 w-4" />
      Go Back
    </button>
  </div>
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 4: Cookie Consent Component

**Files:**
- Create: `apps/landing/src/lib/components/CookieConsent.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import { X, Cookie } from '@lucide/svelte';

  let accepted = $state(false);
  let mounted = $state(false);

  if (typeof window !== 'undefined') {
    mounted = true;
    accepted = localStorage.getItem('cookie-consent') === 'accepted';
  }

  function accept() {
    accepted = true;
    localStorage.setItem('cookie-consent', 'accepted');
  }

  function dismiss() {
    accepted = true;
  }
</script>

{#if mounted && !accepted}
  <div
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-4 shadow-lg dark:border-gray-700 dark:bg-gray-900 sm:px-6 lg:px-8"
  >
    <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
      <div class="flex items-start gap-3">
        <Cookie class="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
        <div>
          <p class="text-sm text-navy dark:text-gray-200">
            We use cookies to enhance your experience. By continuing, you agree to our use of cookies.
          </p>
          <a href="/privacy" class="mt-1 inline-block text-xs font-medium text-emerald hover:underline">
            Learn more in our Privacy Policy
          </a>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          onclick={accept}
          class="rounded-lg bg-emerald px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-dark"
        >
          Accept
        </button>
        <button
          onclick={dismiss}
          class="rounded-lg p-2 text-gray-400 transition-colors hover:text-navy dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
{/if}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 5: Navbar — Dark Mode Toggle + Sign In Link

**Files:**
- Modify: `apps/landing/src/lib/components/Navbar.svelte`

- [ ] **Step 1: Add dark mode state and toggle logic**

Add to `<script>` block after `scrolled` state:

```typescript
  import { Sun, Moon } from '@lucide/svelte';

  let dark = $state(false);

  if (typeof window !== 'undefined') {
    dark = document.documentElement.classList.contains('dark');
  }

  function toggleDark() {
    dark = !dark;
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];
```

Replace the desktop nav section (after the logo, inside the `md:flex` div) with:

```svelte
    <!-- Desktop -->
    <div class="hidden items-center gap-1 md:flex">
      {#each navLinks as link}
        <a
          href={link.href}
          class="px-4 py-2 text-sm font-medium transition-colors {isActive(link.href)
            ? 'text-emerald'
            : 'text-gray-500 hover:text-navy dark:text-gray-400 dark:hover:text-gray-200'}"
        >
          {link.label}
        </a>
      {/each}
      <a
        href="/login"
        class="ml-2 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-navy dark:text-gray-400 dark:hover:text-gray-200"
      >
        Sign In
      </a>
      <button
        onclick={toggleDark}
        class="ml-1 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-navy dark:hover:bg-gray-800 dark:hover:text-gray-200"
        aria-label="Toggle dark mode"
      >
        {#if dark}
          <Sun class="h-4 w-4" />
        {:else}
          <Moon class="h-4 w-4" />
        {/if}
      </button>
      <a
        href="/register"
        class="ml-2 rounded-lg bg-emerald px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald/20 transition-all hover:bg-emerald-dark hover:shadow-emerald/30"
      >
        Start Free Trial
      </a>
    </div>
```

Replace the mobile menu section similarly:

```svelte
  {#if mobileOpen}
    <div class="border-b border-border bg-white px-4 py-6 md:hidden dark:bg-gray-900">
      <div class="flex flex-col gap-2">
        {#each navLinks as link}
          <a
            href={link.href}
            class="rounded-lg px-4 py-3 text-sm font-medium transition-colors {isActive(link.href)
              ? 'bg-emerald/5 text-emerald'
              : 'text-gray-500 hover:bg-gray-50 hover:text-navy dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'}"
            onclick={() => (mobileOpen = false)}
          >
            {link.label}
          </a>
        {/each}
        <a
          href="/login"
          class="rounded-lg px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-navy dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          onclick={() => (mobileOpen = false)}
        >
          Sign In
        </a>
        <button
          onclick={() => { toggleDark(); mobileOpen = false; }}
          class="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-navy dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          {#if dark}
            <Sun class="h-4 w-4" /> Light Mode
          {:else}
            <Moon class="h-4 w-4" /> Dark Mode
          {/if}
        </button>
        <a
          href="/register"
          class="mt-2 rounded-lg bg-emerald px-4 py-3 text-center text-sm font-semibold text-white"
          onclick={() => (mobileOpen = false)}
        >
          Start Free Trial
        </a>
      </div>
    </div>
  {/if}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 6: Footer — Fix Dead Links

**Files:**
- Modify: `apps/landing/src/lib/components/Footer.svelte`

- [ ] **Step 1: Update link arrays**

Replace the `resourceLinks` and `legalLinks` arrays:

```typescript
  const resourceLinks = [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Changelog', href: '#' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ];
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 7: Layout — Add CookieConsent + Dark Mode Init

**Files:**
- Modify: `apps/landing/src/routes/+layout.svelte`

- [ ] **Step 1: Update layout**

```svelte
<script lang="ts">
  import '../app.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import CookieConsent from '$lib/components/CookieConsent.svelte';

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  }
</script>

<div class="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
  <Navbar />
  <main class="relative z-10 flex-1">
    <slot />
  </main>
  <Footer />
  <CookieConsent />
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 8: Login Page

**Files:**
- Create: `apps/landing/src/routes/login/+page.svelte`

- [ ] **Step 1: Create login page**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    Mail,
    Lock,
    ArrowRight,
    AlertCircle,
    CheckCircle,
    Eye,
    EyeOff,
  } from '@lucide/svelte';

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state('');
  let mfaMode = $state(false);

  const mfaParam = $derived(page.url.searchParams.get('mfa') === '1');
  const prefilledEmail = $derived(page.url.searchParams.get('email') || '');

  $effect(() => {
    if (prefilledEmail && !email) {
      email = prefilledEmail;
    }
    if (mfaParam) {
      mfaMode = true;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/v1/merchant/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        error = data.message || data.error || `Login failed (${res.status})`;
        return;
      }

      if (data.mfaRequired) {
        mfaMode = true;
        return;
      }

      if (rememberMe) {
        localStorage.setItem('rememberEmail', email.trim());
      } else {
        localStorage.removeItem('rememberEmail');
      }

      goto('/dashboard');
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign In — jamicore</title>
  <meta
    name="description"
    content="Sign in to your jamicore merchant dashboard. Manage your stores, products, and orders."
  />
  <meta property="og:title" content="Sign In — jamicore" />
  <meta property="og:description" content="Sign in to your jamicore merchant dashboard." />
  <meta property="og:url" content="https://jamicore.com/login" />
  <meta name="twitter:title" content="Sign In — jamicore" />
  <meta name="twitter:description" content="Sign in to your jamicore merchant dashboard." />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-10 text-center">
    <h1 class="text-3xl font-bold tracking-tight text-navy">Welcome back</h1>
    <p class="mt-2 text-gray-500">Sign in to your merchant dashboard.</p>
  </div>

  {#if mfaMode}
    <div class="rounded-xl border border-emerald/20 bg-emerald/5 p-8 text-center">
      <CheckCircle class="mx-auto h-10 w-10 text-emerald" />
      <h2 class="mt-4 text-lg font-semibold text-navy">Two-Factor Authentication</h2>
      <p class="mt-2 text-sm text-gray-500">
        Please check your email for a verification code and enter it on the MFA verification page.
      </p>
      <a
        href="/verify-mfa"
        class="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-dark"
      >
        Enter Verification Code
        <ArrowRight class="h-4 w-4" />
      </a>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if error}
        <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:bg-red-950/20">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span class="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      {/if}

      <div class="space-y-1.5">
        <label for="email" class="text-sm font-semibold text-navy dark:text-gray-200">Email</label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-semibold text-navy dark:text-gray-200">Password</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="Enter your password"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-navy dark:hover:text-gray-200"
            aria-label="Toggle password visibility"
          >
            {#if showPassword}
              <EyeOff class="h-4 w-4" />
            {:else}
              <Eye class="h-4 w-4" />
            {/if}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            bind:checked={rememberMe}
            class="h-4 w-4 rounded border-gray-300 text-emerald focus:ring-emerald"
          />
          <span class="text-sm text-gray-500 dark:text-gray-400">Remember me</span>
        </label>
        <a href="/forgot-password" class="text-sm font-medium text-emerald hover:underline">
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="group flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3.5 text-sm font-semibold text-white shadow-sm shadow-emerald/20 transition-all hover:bg-emerald-dark disabled:opacity-60"
      >
        {#if loading}
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          Signing in...
        {:else}
          Sign In
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        {/if}
      </button>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Don't have an account?
        <a href="/register" class="font-semibold text-emerald transition-colors hover:text-emerald-dark">
          Create one free
        </a>
      </p>
    </form>
  {/if}
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 9: Forgot Password Page

**Files:**
- Create: `apps/landing/src/routes/forgot-password/+page.svelte`

- [ ] **Step 1: Create forgot password page**

```svelte
<script lang="ts">
  import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from '@lucide/svelte';

  let email = $state('');
  let loading = $state(false);
  let error = $state('');
  let sent = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error = 'Please enter a valid email address';
      return;
    }

    loading = true;
    try {
      const res = await fetch('/api/v1/merchant/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        error = data.message || data.error || `Request failed (${res.status})`;
        return;
      }

      sent = true;
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Reset Password — jamicore</title>
  <meta
    name="description"
    content="Reset your jamicore merchant account password. We'll send you a secure link."
  />
  <meta property="og:title" content="Reset Password — jamicore" />
  <meta property="og:description" content="Reset your jamicore merchant account password." />
  <meta property="og:url" content="https://jamicore.com/forgot-password" />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-10 text-center">
    <h1 class="text-3xl font-bold tracking-tight text-navy dark:text-gray-200">Reset your password</h1>
    <p class="mt-2 text-gray-500">Enter your email and we'll send you a reset link.</p>
  </div>

  {#if sent}
    <div class="rounded-xl border border-emerald/20 bg-emerald/5 p-8 text-center">
      <CheckCircle class="mx-auto h-10 w-10 text-emerald" />
      <h2 class="mt-4 text-lg font-semibold text-navy dark:text-gray-200">Check your email</h2>
      <p class="mt-2 text-sm text-gray-500">
        If an account exists for <strong class="text-navy dark:text-gray-200">{email}</strong>, you'll receive a password reset link shortly.
      </p>
      <a
        href="/login"
        class="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-emerald/30 hover:bg-emerald/5 dark:border-gray-700 dark:text-gray-200 dark:hover:border-emerald/30"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to Sign In
      </a>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if error}
        <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:bg-red-950/20">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span class="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      {/if}

      <div class="space-y-1.5">
        <label for="email" class="text-sm font-semibold text-navy dark:text-gray-200">Email</label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
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
          Sending...
        {:else}
          Send Reset Link
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        {/if}
      </button>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Remember your password?
        <a href="/login" class="font-semibold text-emerald hover:underline">Sign in</a>
      </p>
    </form>
  {/if}
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 10: Reset Password Page

**Files:**
- Create: `apps/landing/src/routes/reset-password/+page.svelte`

- [ ] **Step 1: Create reset password page**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Lock, ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff } from '@lucide/svelte';

  let password = $state('');
  let confirmPassword = $state('');
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  const token = $derived(page.url.searchParams.get('token') || '');

  $effect(() => {
    if (!token) {
      error = 'Invalid or missing reset token. Please request a new reset link.';
    }
  });

  function validate(): string | null {
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

    if (!token) {
      error = 'Invalid or missing reset token.';
      return;
    }

    loading = true;
    try {
      const res = await fetch('/api/v1/merchant/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        error = data.message || data.error || `Reset failed (${res.status})`;
        return;
      }

      success = true;
      setTimeout(() => goto('/login'), 3000);
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Create New Password — jamicore</title>
  <meta name="description" content="Create a new password for your jamicore merchant account." />
  <meta property="og:title" content="Create New Password — jamicore" />
  <meta property="og:description" content="Create a new password for your jamicore merchant account." />
  <meta property="og:url" content="https://jamicore.com/reset-password" />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-10 text-center">
    <h1 class="text-3xl font-bold tracking-tight text-navy dark:text-gray-200">Create new password</h1>
    <p class="mt-2 text-gray-500">Enter your new password below.</p>
  </div>

  {#if success}
    <div class="rounded-xl border border-emerald/20 bg-emerald/5 p-8 text-center">
      <CheckCircle class="mx-auto h-10 w-10 text-emerald" />
      <h2 class="mt-4 text-lg font-semibold text-navy dark:text-gray-200">Password updated</h2>
      <p class="mt-2 text-sm text-gray-500">Redirecting you to sign in...</p>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if error}
        <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:bg-red-950/20">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span class="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      {/if}

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-semibold text-navy dark:text-gray-200">New Password</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="Min 8 chars, upper, lower, number"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-navy dark:hover:text-gray-200"
            aria-label="Toggle password visibility"
          >
            {#if showPassword}
              <EyeOff class="h-4 w-4" />
            {:else}
              <Eye class="h-4 w-4" />
            {/if}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="text-sm font-semibold text-navy dark:text-gray-200">Confirm Password</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Repeat new password"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !token}
        class="group flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3.5 text-sm font-semibold text-white shadow-sm shadow-emerald/20 transition-all hover:bg-emerald-dark disabled:opacity-60"
      >
        {#if loading}
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          Updating...
        {:else}
          Update Password
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        {/if}
      </button>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        <a href="/login" class="font-semibold text-emerald hover:underline">Back to Sign In</a>
      </p>
    </form>
  {/if}
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 11: Privacy Policy Page

**Files:**
- Create: `apps/landing/src/routes/privacy/+page.svelte`

- [ ] **Step 1: Create privacy policy page**

```svelte
<svelte:head>
  <title>Privacy Policy — jamicore</title>
  <meta name="description" content="jamicore Privacy Policy. Learn how we collect, use, and protect your data." />
  <meta property="og:title" content="Privacy Policy — jamicore" />
  <meta property="og:description" content="jamicore Privacy Policy." />
  <meta property="og:url" content="https://jamicore.com/privacy" />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-12">
    <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Legal</p>
    <h1 class="text-4xl font-bold tracking-tight text-navy dark:text-gray-200">Privacy Policy</h1>
    <p class="mt-2 text-sm text-gray-500">Last updated: May 22, 2026</p>
  </div>

  <div class="space-y-10 text-gray-500 dark:text-gray-400">
    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">1. Introduction</h2>
      <p class="mt-2 leading-relaxed">
        jamicore values your privacy. This policy explains what information we collect, how we use it, and your rights regarding that data. By using our platform, you agree to the practices described here.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">2. Information We Collect</h2>
      <p class="mt-2 leading-relaxed">
        We collect information you provide directly (name, email, store details, payment info), automatically (IP address, browser type, usage data), and from third parties (payment processors, analytics). We only collect what is necessary to operate and improve the platform.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">3. How We Use Your Data</h2>
      <p class="mt-2 leading-relaxed">
        Your data is used to provide core services (store management, order processing), communicate with you (support, updates), ensure security (fraud prevention, authentication), and improve the platform (analytics, feature development). We do not sell your personal data.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">4. Cookies</h2>
      <p class="mt-2 leading-relaxed">
        We use cookies for authentication (keeping you signed in), preferences (language, theme), and analytics (understanding platform usage). You can manage cookies through your browser settings. Disabling cookies may affect platform functionality.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">5. Your Rights</h2>
      <p class="mt-2 leading-relaxed">
        Depending on your location, you have rights to access, correct, delete, or port your data. You may also object to certain processing or withdraw consent. To exercise these rights, contact us at the email below.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">6. Data Retention</h2>
      <p class="mt-2 leading-relaxed">
        We retain your data for as long as your account is active or as needed to provide services. When you delete your account, we remove personal data within 30 days, except where legal obligations require longer retention.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">7. Contact</h2>
      <p class="mt-2 leading-relaxed">
        Questions about this policy? Contact us at
        <a href="mailto:privacy@jamicore.com" class="text-emerald hover:underline">privacy@jamicore.com</a>.
      </p>
    </section>
  </div>
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 12: Terms of Service Page

**Files:**
- Create: `apps/landing/src/routes/terms/+page.svelte`

- [ ] **Step 1: Create terms of service page**

```svelte
<svelte:head>
  <title>Terms of Service — jamicore</title>
  <meta name="description" content="jamicore Terms of Service. Read the agreement for using our platform." />
  <meta property="og:title" content="Terms of Service — jamicore" />
  <meta property="og:description" content="jamicore Terms of Service." />
  <meta property="og:url" content="https://jamicore.com/terms" />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-12">
    <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Legal</p>
    <h1 class="text-4xl font-bold tracking-tight text-navy dark:text-gray-200">Terms of Service</h1>
    <p class="mt-2 text-sm text-gray-500">Last updated: May 22, 2026</p>
  </div>

  <div class="space-y-10 text-gray-500 dark:text-gray-400">
    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">1. Agreement</h2>
      <p class="mt-2 leading-relaxed">
        By accessing or using jamicore, you agree to be bound by these terms. If you do not agree, you may not use the platform. We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">2. Use of Service</h2>
      <p class="mt-2 leading-relaxed">
        jamicore provides e-commerce infrastructure for merchants. You may use the platform only for lawful purposes. Prohibited uses include distributing illegal goods, interfering with other users, attempting unauthorized access, and reverse engineering.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">3. Account Terms</h2>
      <p class="mt-2 leading-relaxed">
        You are responsible for maintaining account security and accuracy of information. You must be at least 18 years old. We may suspend or terminate accounts that violate these terms or remain inactive for extended periods.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">4. Payment</h2>
      <p class="mt-2 leading-relaxed">
        Subscription fees are billed in advance. You authorize us to charge your payment method. Refunds are provided at our discretion. Failure to pay may result in account suspension. Prices are subject to change with 30 days notice.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">5. Termination</h2>
      <p class="mt-2 leading-relaxed">
        Either party may terminate the agreement at any time. Upon termination, we will retain your data for a limited period to allow export, then delete it in accordance with our Privacy Policy. Fees paid are non-refundable except where required by law.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">6. Limitation of Liability</h2>
      <p class="mt-2 leading-relaxed">
        jamicore is provided as-is without warranties. Our liability is limited to the amount you paid in the last 12 months. We are not liable for indirect, incidental, or consequential damages arising from platform use.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">7. Changes to Terms</h2>
      <p class="mt-2 leading-relaxed">
        We may modify these terms at any time. Material changes will be notified via email or platform notice. Your continued use after changes indicates acceptance of the updated terms.
      </p>
    </section>

    <section>
      <h2 class="text-xl font-semibold text-navy dark:text-gray-200">8. Contact</h2>
      <p class="mt-2 leading-relaxed">
        Questions about these terms? Contact us at
        <a href="mailto:legal@jamicore.com" class="text-emerald hover:underline">legal@jamicore.com</a>.
      </p>
    </section>
  </div>
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 13: Contact Page

**Files:**
- Create: `apps/landing/src/routes/contact/+page.svelte`

- [ ] **Step 1: Create contact page**

```svelte
<script lang="ts">
  import { User, Mail, MessageSquare, Send, ArrowRight, AlertCircle, CheckCircle } from '@lucide/svelte';

  let name = $state('');
  let email = $state('');
  let subject = $state('');
  let message = $state('');
  let loading = $state(false);
  let error = $state('');
  let sent = $state(false);

  function validate(): string | null {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address';
    if (!subject.trim()) return 'Subject is required';
    if (!message.trim()) return 'Message is required';
    if (message.trim().length < 10) return 'Message must be at least 10 characters';
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
    // Frontend-only: simulate sending
    await new Promise((resolve) => setTimeout(resolve, 800));
    loading = false;
    sent = true;
  }
</script>

<svelte:head>
  <title>Contact Us — jamicore</title>
  <meta name="description" content="Get in touch with the jamicore team. We're here to help." />
  <meta property="og:title" content="Contact Us — jamicore" />
  <meta property="og:description" content="Get in touch with the jamicore team." />
  <meta property="og:url" content="https://jamicore.com/contact" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-24 pt-32 sm:px-6 lg:px-8">
  <div class="mb-12 text-center">
    <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Contact</p>
    <h1 class="text-4xl font-bold tracking-tight text-navy dark:text-gray-200">Get in touch</h1>
    <p class="mt-2 text-gray-500">Have a question? We'd love to hear from you.</p>
  </div>

  {#if sent}
    <div class="rounded-xl border border-emerald/20 bg-emerald/5 p-8 text-center">
      <CheckCircle class="mx-auto h-10 w-10 text-emerald" />
      <h2 class="mt-4 text-lg font-semibold text-navy dark:text-gray-200">Message sent</h2>
      <p class="mt-2 text-sm text-gray-500">
        Thank you for reaching out. We'll get back to you within 24 hours.
      </p>
      <a
        href="/"
        class="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-dark"
      >
        Back to Home
        <ArrowRight class="h-4 w-4" />
      </a>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if error}
        <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:bg-red-950/20">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span class="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      {/if}

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="name" class="text-sm font-semibold text-navy dark:text-gray-200">Name *</label>
          <div class="relative">
            <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="name"
              type="text"
              bind:value={name}
              placeholder="Your name"
              class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
        <div class="space-y-1.5">
          <label for="email" class="text-sm font-semibold text-navy dark:text-gray-200">Email *</label>
          <div class="relative">
            <Mail class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="you@example.com"
              class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="subject" class="text-sm font-semibold text-navy dark:text-gray-200">Subject *</label>
        <div class="relative">
          <MessageSquare class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="subject"
            type="text"
            bind:value={subject}
            placeholder="How can we help?"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="message" class="text-sm font-semibold text-navy dark:text-gray-200">Message *</label>
        <textarea
          id="message"
          bind:value={message}
          rows={5}
          placeholder="Tell us more about your question..."
          class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="group flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3.5 text-sm font-semibold text-white shadow-sm shadow-emerald/20 transition-all hover:bg-emerald-dark disabled:opacity-60"
      >
        {#if loading}
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          Sending...
        {:else}
          Send Message
          <Send class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        {/if}
      </button>

      <p class="text-center text-xs text-gray-400">
        You can also email us directly at
        <a href="mailto:support@jamicore.com" class="text-emerald hover:underline">support@jamicore.com</a>
      </p>
    </form>
  {/if}
</div>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 14: Home Page — Trusted By + Testimonials + JSON-LD

**Files:**
- Modify: `apps/landing/src/routes/+page.svelte`

- [ ] **Step 1: Add imports and data**

After the existing imports, add:

```typescript
  import { Star, Quote } from '@lucide/svelte';

  // Trusted by — text-only descriptors (no logos)
  const trustedBy = [
    'Regional Retailer',
    'F&B Chain',
    'Electronics Store',
    'Fashion Boutique',
    'Health & Wellness',
    'Home Goods Brand',
  ];

  // Fictional testimonials — no real names or brands
  const testimonials = [
    {
      name: 'Omar Hassan',
      role: 'Founder, Brio Cafe',
      initials: 'OH',
      quote:
        'jamicore transformed how we manage our online orders. The WhatsApp integration alone saved us hours every week. Setup took less than a day.',
      rating: 5,
    },
    {
      name: 'Layla Al-Rashid',
      role: 'Operations Manager, Desert Bloom Trading',
      initials: 'LA',
      quote:
        'We run three storefronts from one dashboard. The multi-tenant architecture is exactly what we needed. Support response time is outstanding.',
      rating: 5,
    },
    {
      name: 'Khalid Farouk',
      role: 'CEO, Al-Manara Electronics',
      initials: 'KF',
      quote:
        'After migrating from our old platform, our conversion rate improved by 18%. The analytics dashboard gives us insights we never had before.',
      rating: 5,
    },
  ];
```

- [ ] **Step 2: Add Trusted By section after Hero**

After the Hero section closing `</section>` (after line 282), add:

```svelte
<!-- Trusted By -->
<section class="border-b border-gray-100 py-14 dark:border-gray-800">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <p class="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
      Built for merchants everywhere
    </p>
    <div class="flex flex-wrap items-center justify-center gap-4">
      {#each trustedBy as label}
        <div
          class="rounded-full border border-gray-200 bg-white px-5 py-2 text-xs font-medium text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          {label}
        </div>
      {/each}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add Testimonials section after Pricing**

After the Pricing section closing `</section>` (before the FAQ section), add:

```svelte
<!-- Testimonials -->
<section class="overflow-hidden bg-gray-50 py-24 dark:bg-gray-900 lg:py-32">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 max-w-2xl">
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald">Testimonials</p>
      <h2 class="text-4xl font-bold tracking-tight text-navy dark:text-gray-200 sm:text-5xl">
        Loved by
        <span class="font-serif italic">merchants</span>
      </h2>
      <p class="mt-4 text-lg text-gray-500 dark:text-gray-400">
        Hear from businesses already using jamicore to power their online stores.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      {#each testimonials as t}
        <div class="relative flex flex-col rounded-xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Quote class="absolute right-6 top-6 h-8 w-8 text-emerald/10" />

          <div class="flex gap-1">
            {#each Array(t.rating) as _}
              <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
            {/each}
          </div>

          <p class="mt-5 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            "{t.quote}"
          </p>

          <div class="mt-6 flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald/10 text-sm font-bold text-emerald"
            >
              {t.initials}
            </div>
            <div>
              <div class="text-sm font-semibold text-navy dark:text-gray-200">{t.name}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{t.role}</div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
```

- [ ] **Step 4: Add JSON-LD structured data**

Inside `<svelte:head>`, after the description meta tag, add:

```svelte
  {@html `
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareApplication",
            "name": "jamicore",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "The enterprise multi-tenant e-commerce platform built for modern merchants."
          },
          {
            "@type": "Organization",
            "name": "jamicore",
            "url": "https://jamicore.com",
            "email": "support@jamicore.com",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Dubai",
              "addressCountry": "AE"
            }
          }
        ]
      }
    </script>
  `}
```

- [ ] **Step 5: Add OG meta tags to home page head**

In `<svelte:head>`, add after description:

```svelte
  <meta property="og:title" content="jamicore — E-Commerce That Scales With You" />
  <meta property="og:description" content="The enterprise multi-tenant e-commerce platform built for modern merchants." />
  <meta property="og:url" content="https://jamicore.com" />
  <meta name="twitter:title" content="jamicore — E-Commerce That Scales With You" />
  <meta name="twitter:description" content="The enterprise multi-tenant e-commerce platform built for modern merchants." />
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 15: Register Page Improvements

**Files:**
- Modify: `apps/landing/src/routes/register/+page.svelte`

- [ ] **Step 1: Add password strength state and terms checkbox**

Add to `<script>` after existing state declarations:

```typescript
  let termsAccepted = $state(false);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);

  function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald' };
  }

  const passwordStrength = $derived(getPasswordStrength(password));
```

- [ ] **Step 2: Update validate() to include terms**

Replace the existing `validate()` function:

```typescript
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
    if (!termsAccepted) return 'You must agree to the Terms of Service and Privacy Policy';
    return null;
  }
```

- [ ] **Step 3: Update handleSubmit for MFA**

Replace the success handling in `handleSubmit`:

```typescript
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        error = data.message || data.error || `Registration failed (${res.status})`;
        return;
      }

      if (data.mfaRequired) {
        goto(`/login?mfa=1&email=${encodeURIComponent(ownerEmail.trim())}`);
        return;
      }

      success = true;
      setTimeout(() => goto('/'), 2000);
```

- [ ] **Step 4: Update password fields with strength bar and show toggle**

Replace the existing password input block (around line 190-200):

```svelte
      <div class="space-y-1.5">
        <label for="password" class="text-sm font-semibold text-navy">Password *</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="Min 8 chars, upper, lower, number"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-navy"
            aria-label="Toggle password visibility"
          >
            {#if showPassword}
              <EyeOff class="h-4 w-4" />
            {:else}
              <Eye class="h-4 w-4" />
            {/if}
          </button>
        </div>
        {#if password}
          <div class="mt-2 space-y-1">
            <div class="flex items-center justify-between">
              <div class="h-1.5 flex-1 rounded-full bg-gray-100">
                <div
                  class="h-1.5 rounded-full transition-all {passwordStrength.color}"
                  style="width: {(passwordStrength.score / 6) * 100}%"
                ></div>
              </div>
            </div>
            <p class="text-xs text-gray-400">
              Strength: <span class="font-medium {passwordStrength.color.replace('bg-', 'text-')}">{passwordStrength.label}</span>
            </p>
          </div>
        {/if}
      </div>
```

Replace the existing confirm password input block:

```svelte
      <div class="space-y-1.5">
        <label for="confirmPassword" class="text-sm font-semibold text-navy">Confirm Password *</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            bind:value={confirmPassword}
            placeholder="Repeat password"
            class="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-navy placeholder:text-gray-400 transition-colors focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/10"
          />
          <button
            type="button"
            onclick={() => (showConfirmPassword = !showConfirmPassword)}
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-navy"
            aria-label="Toggle confirm password visibility"
          >
            {#if showConfirmPassword}
              <EyeOff class="h-4 w-4" />
            {:else}
              <Eye class="h-4 w-4" />
            {/if}
          </button>
        </div>
      </div>
```

- [ ] **Step 5: Add terms checkbox before submit button**

Add before the submit button:

```svelte
      <label class="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <input
          type="checkbox"
          bind:checked={termsAccepted}
          class="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald focus:ring-emerald"
        />
        <span class="text-xs text-gray-500 dark:text-gray-400">
          I agree to the
          <a href="/terms" class="font-medium text-emerald hover:underline" target="_blank">Terms of Service</a>
          and
          <a href="/privacy" class="font-medium text-emerald hover:underline" target="_blank">Privacy Policy</a>.
        </span>
      </label>
```

- [ ] **Step 6: Update Sign In link**

Change the existing "Already have an account?" link from `href="/"` to `href="/login"`.

- [ ] **Step 7: Add Eye/EyeOff imports**

Add `Eye, EyeOff` to the existing import list from `@lucide/svelte`.

- [ ] **Step 8: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 16: OG Meta for Pricing and About Pages

**Files:**
- Modify: `apps/landing/src/routes/pricing/+page.svelte`
- Modify: `apps/landing/src/routes/about/+page.svelte`

- [ ] **Step 1: Add OG meta to pricing page**

In `<svelte:head>` of `pricing/+page.svelte`, add after the description meta:

```svelte
  <meta property="og:title" content="Pricing — jamicore" />
  <meta property="og:description" content="Simple, transparent pricing for every stage of your business." />
  <meta property="og:url" content="https://jamicore.com/pricing" />
  <meta name="twitter:title" content="Pricing — jamicore" />
  <meta name="twitter:description" content="Simple, transparent pricing for every stage of your business." />
```

- [ ] **Step 2: Add OG meta to about page**

In `<svelte:head>` of `about/+page.svelte`, add after the description meta:

```svelte
  <meta property="og:title" content="About — jamicore" />
  <meta property="og:description" content="Learn about jamicore's mission, technology, and values." />
  <meta property="og:url" content="https://jamicore.com/about" />
  <meta name="twitter:title" content="About — jamicore" />
  <meta name="twitter:description" content="Learn about jamicore's mission, technology, and values." />
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: Pass

---

## Task 17: Final Verification

- [ ] **Step 1: TypeScript check**

Run: `pnpm typecheck`
Expected: Zero errors across all apps

- [ ] **Step 2: No console.log in landing app**

Run:
```powershell
Select-String -Path "apps/landing/src" -Pattern "console\.log" -Recurse
```
Expected: No matches

- [ ] **Step 3: Build check**

Run: `pnpm build`
Expected: Landing app builds successfully

- [ ] **Step 4: Update PROGRESS.md**

Add entry:
```markdown
## 2026-05-22
- Landing page complete: login, forgot-password, reset-password, privacy, terms, contact pages
- Added testimonials, trusted-by, JSON-LD structured data
- Added cookie consent banner, dark mode toggle, error page
- Added password strength indicator, terms checkbox, MFA handling on register
- Added Open Graph / Twitter meta tags across all pages
- Updated navbar with Sign In link and dark mode toggle
- Fixed footer dead legal links
```

- [ ] **Step 5: Update feature_list.json**

Add a new phase "landing" with these features:
- Landing: Login page
- Landing: Forgot / reset password
- Landing: Privacy Policy
- Landing: Terms of Service
- Landing: Contact page
- Landing: Testimonials + Trusted By
- Landing: SEO (OG, JSON-LD, meta)
- Landing: Cookie consent + Dark mode
- Landing: Error page
- Landing: Register improvements (terms, strength, MFA)

---

## Spec Coverage Check

| Spec Section | Task |
|---|---|
| 1.1 Login page | Task 8 |
| 1.2 Forgot password | Task 9 |
| 1.3 Reset password | Task 10 |
| 1.4 Privacy Policy | Task 11 |
| 1.5 Terms of Service | Task 12 |
| 1.6 Contact page | Task 13 |
| 2.1 Testimonials | Task 14 |
| 2.2 Trusted By | Task 14 |
| 2.3 JSON-LD | Task 14 |
| 3.1 OG/Twitter meta | Tasks 1, 14, 16 |
| 3.2 Cookie consent | Tasks 4, 7 |
| 3.3 Dark mode | Tasks 2, 5, 7 |
| 3.4 Error page | Task 3 |
| 3.5 Navbar improvements | Task 5 |
| 4.1 Terms checkbox | Task 15 |
| 4.2 Password strength | Task 15 |
| 4.3 MFA handling | Task 15 |

**All spec requirements covered.**
