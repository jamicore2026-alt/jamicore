<script lang="ts">
  let orderNumber = $state('');
  let email = $state('');
  let order = $state<Record<string, any> | null>(null);
  let error = $state('');

  async function trackOrder() {
    try {
      const res = await fetch(`/api/v1/public/orders/track?number=${orderNumber}&email=${email}`);
      if (!res.ok) throw new Error('Order not found');
      order = await res.json();
      error = '';
    } catch (err) {
      error = 'Order not found. Please check your order number and email.';
      order = null;
    }
  }
</script>

<div class="max-w-md mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">Track Your Order</h1>
  <form onsubmit={(e) => { e.preventDefault(); trackOrder(); }} class="space-y-4">
    <input bind:value={orderNumber} placeholder="Order Number" class="w-full border p-2 rounded" />
    <input bind:value={email} type="email" placeholder="Email" class="w-full border p-2 rounded" />
    <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded">Track Order</button>
  </form>

  {#if error}
    <p class="text-red-500 mt-4">{error}</p>
  {/if}

  {#if order}
    <div class="mt-4 p-4 border rounded">
      <p><strong>Status:</strong> {order.status}</p>
      <p><strong>Total:</strong> {order.total}</p>
    </div>
  {/if}
</div>
