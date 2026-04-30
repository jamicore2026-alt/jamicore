<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  interface AddressData {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    phone: string;
  }

  interface Props {
    address?: Partial<AddressData>;
    onSubmit: (data: AddressData) => void;
    submitLabel?: string;
    loading?: boolean;
  }

  let { address = {}, onSubmit, submitLabel = 'Continue', loading = false }: Props = $props();

	// svelte-ignore state_referenced_locally
  let form = $state<AddressData>({
    firstName: address.firstName ?? '',
    lastName: address.lastName ?? '',
    addressLine1: address.addressLine1 ?? '',
    addressLine2: address.addressLine2 ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    country: address.country ?? '',
    postalCode: address.postalCode ?? '',
    phone: address.phone ?? '',
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    onSubmit(form);
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label for="firstName" class="text-sm font-medium">First Name</Label>
      <Input id="firstName" bind:value={form.firstName} required class="mt-1" />
    </div>
    <div>
      <Label for="lastName" class="text-sm font-medium">Last Name</Label>
      <Input id="lastName" bind:value={form.lastName} required class="mt-1" />
    </div>
  </div>

  <div>
    <Label for="address1" class="text-sm font-medium">Address Line 1</Label>
    <Input id="address1" bind:value={form.addressLine1} required class="mt-1" />
  </div>

  <div>
    <Label for="address2" class="text-sm font-medium">Address Line 2</Label>
    <Input id="address2" bind:value={form.addressLine2} class="mt-1" />
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label for="city" class="text-sm font-medium">City</Label>
      <Input id="city" bind:value={form.city} required class="mt-1" />
    </div>
    <div>
      <Label for="state" class="text-sm font-medium">State/Province</Label>
      <Input id="state" bind:value={form.state} class="mt-1" />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label for="country" class="text-sm font-medium">Country</Label>
      <Input id="country" bind:value={form.country} required maxlength={2} placeholder="US" class="mt-1" />
    </div>
    <div>
      <Label for="postalCode" class="text-sm font-medium">Postal Code</Label>
      <Input id="postalCode" bind:value={form.postalCode} required class="mt-1" />
    </div>
  </div>

  <div>
    <Label for="phone" class="text-sm font-medium">Phone</Label>
    <Input id="phone" type="tel" bind:value={form.phone} class="mt-1" />
  </div>

  <Button type="submit" class="w-full" size="lg" disabled={loading}>
    {loading ? 'Processing...' : submitLabel}
  </Button>
</form>