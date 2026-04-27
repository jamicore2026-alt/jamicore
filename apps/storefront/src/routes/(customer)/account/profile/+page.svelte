<script lang="ts">
  import type { PageData } from './$types.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import { getCookie } from '$lib/api/client.js';

  let { data }: { data: PageData } = $props();
  const customer = $derived(data.customer);

  let firstName = $state(customer?.firstName ?? '');
  let lastName = $state(customer?.lastName ?? '');
  let phone = $state(customer?.phone ?? '');
  let marketingEmails = $state(customer?.marketingEmails ?? false);
  let saving = $state(false);
  let saved = $state(false);
  let error = $state('');

  async function saveProfile() {
    saving = true;
    saved = false;
    error = '';
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch('/api/v1/customer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
          marketingEmails,
        }),
      });
      if (res.ok) {
        saved = true;
      } else {
        const d = await res.json().catch(() => ({ message: 'Failed to save' }));
        error = d.message;
      }
    } catch {
      error = 'Failed to save profile';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Profile | My Account</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold text-[var(--color-text)] mb-6">Profile</h1>

  {#if !customer}
    <p class="text-[var(--color-text-secondary)]">Unable to load profile.</p>
  {:else}
    <div class="max-w-lg space-y-6">
      <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="firstName" class="text-sm font-medium">First Name</Label>
            <Input id="firstName" bind:value={firstName} class="mt-1" />
          </div>
          <div>
            <Label for="lastName" class="text-sm font-medium">Last Name</Label>
            <Input id="lastName" bind:value={lastName} class="mt-1" />
          </div>
        </div>

        <div>
          <Label class="text-sm font-medium">Email</Label>
          <p class="text-sm text-[var(--color-text-secondary)] mt-1">{customer.email}</p>
        </div>

        <div>
          <Label for="phone" class="text-sm font-medium">Phone</Label>
          <Input id="phone" type="tel" bind:value={phone} class="mt-1" />
        </div>

        <div class="flex items-center justify-between">
          <Label for="marketing" class="text-sm font-medium">Marketing Emails</Label>
          <Switch id="marketing" bind:checked={marketingEmails} />
        </div>

        {#if error}
          <p class="text-sm text-[var(--color-error)]">{error}</p>
        {/if}
        {#if saved}
          <p class="text-sm text-green-600">Profile saved!</p>
        {/if}

        <Button onclick={saveProfile} disabled={saving} class="w-full">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  {/if}
</div>