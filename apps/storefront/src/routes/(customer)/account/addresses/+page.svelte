<script lang="ts">
  import type { PageData } from './$types.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Plus, Trash2, Star } from '@lucide/svelte';
  import AddressForm from '$lib/components/checkout/AddressForm.svelte';
  import { getCookie } from '$lib/api/client.js';

  let { data }: { data: PageData } = $props();

  let addresses = $state(data.addresses);
  let showAddForm = $state(false);
  let adding = $state(false);

  async function addAddress(address: any) {
    adding = true;
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch('/api/v1/customer/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: `${address.firstName} ${address.lastName}`,
          ...address,
          isDefault: addresses.length === 0,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        addresses = [...addresses, d.address];
        showAddForm = false;
      }
    } catch {
      // failed
    } finally {
      adding = false;
    }
  }

  async function deleteAddress(id: string) {
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch(`/api/v1/customer/addresses/${id}`, {
        method: 'DELETE',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        credentials: 'include',
      });
      if (res.ok) {
        addresses = addresses.filter((a: any) => a.id !== id);
      }
    } catch {
      // failed
    }
  }

  async function setDefault(id: string) {
    try {
      const csrfToken = getCookie('csrf_token');
      const res = await fetch(`/api/v1/customer/addresses/${id}/default`, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        credentials: 'include',
      });
      if (res.ok) {
        addresses = addresses.map((a: any) => ({
          ...a,
          isDefault: a.id === id,
        }));
      }
    } catch {
      // failed
    }
  }
</script>

<svelte:head>
  <title>Addresses | My Account</title>
</svelte:head>

<div>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-[var(--color-text)]">Addresses</h1>
    <Button size="sm" onclick={() => (showAddForm = !showAddForm)}>
      <Plus class="size-4 mr-1" />
      Add Address
    </Button>
  </div>

  {#if showAddForm}
    <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 text-[var(--color-text)]">New Address</h2>
      <AddressForm onSubmit={addAddress} loading={adding} submitLabel="Add Address" />
    </div>
  {/if}

  {#if addresses.length === 0 && !showAddForm}
    <p class="text-[var(--color-text-secondary)] text-center py-8">No saved addresses</p>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each addresses as addr (addr.id)}
        <div class="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] {addr.isDefault ? 'border-[var(--color-primary)]' : ''}">
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="text-sm font-medium text-[var(--color-text)]">{addr.firstName} {addr.lastName}</p>
              {#if addr.isDefault}
                <Badge class="bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs">Default</Badge>
              {/if}
            </div>
            <div class="flex items-center gap-1">
              {#if !addr.isDefault}
                <button
                  class="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                  onclick={() => setDefault(addr.id)}
                  aria-label="Set as default"
                >
                  <Star class="size-4" />
                </button>
              {/if}
              <button
                class="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                onclick={() => deleteAddress(addr.id)}
                aria-label="Delete address"
              >
                <Trash2 class="size-4" />
              </button>
            </div>
          </div>
          <p class="text-sm text-[var(--color-text-secondary)]">
            {addr.addressLine1}<br/>
            {#if addr.addressLine2}{addr.addressLine2}<br/>{/if}
            {addr.city}, {addr.state} {addr.postalCode}<br/>
            {addr.country}
          </p>
        </div>
      {/each}
    </div>
  {/if}
</div>