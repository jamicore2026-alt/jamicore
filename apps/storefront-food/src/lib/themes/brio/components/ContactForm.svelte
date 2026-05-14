<script lang="ts">
  interface Props {
    onSubmit?: (data: { name: string; email: string; subject: string; message: string }) => void;
  }

  let { onSubmit }: Props = $props();

  let name = $state('');
  let email = $state('');
  let subject = $state('');
  let message = $state('');
  let loading = $state(false);
  let success = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    success = false;

    try {
      onSubmit?.({ name, email, subject, message });
      success = true;
      name = '';
      email = '';
      subject = '';
      message = '';
    } finally {
      loading = false;
    }
  }
</script>

<div class="bg-white border p-6" style="border-color: #e5e5e5; border-radius: 4px;">
  {#if success}
    <div class="p-4 mb-4 text-sm font-medium" style="background-color: #e8f5e9; color: #1a4d2e; border-radius: 4px;">
      Thank you! Your message has been sent.
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-name">Name</label>
      <input
        id="contact-name"
        type="text"
        bind:value={name}
        required
        class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]"
        style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"
        placeholder="Your name"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-email">Email</label>
      <input
        id="contact-email"
        type="email"
        bind:value={email}
        required
        class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]"
        style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"
        placeholder="your@email.com"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-subject">Subject</label>
      <input
        id="contact-subject"
        type="text"
        bind:value={subject}
        required
        class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]"
        style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"
        placeholder="What's this about?"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-message">Message</label>
      <textarea
        id="contact-message"
        bind:value={message}
        required
        rows={4}
        class="w-full px-3 py-2 text-sm outline-none transition-colors resize-none focus:border-[#1a4d2e]"
        style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"
        placeholder="Your message..."
      ></textarea>
    </div>

    <button
      type="submit"
      disabled={loading}
      class="w-full py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
      style="background-color: #1a4d2e; border-radius: 4px;"
    >
      {#if loading}
        Sending...
      {:else}
        Send Message
      {/if}
    </button>
  </form>
</div>
