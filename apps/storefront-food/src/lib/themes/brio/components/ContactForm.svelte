<script lang="ts">
  import type { Customization } from '../themeTokens';
  import { getTokens, btnClasses, btnStyle } from '../themeTokens';

  interface Props {
    onSubmit?: (data: { name: string; email: string; subject: string; message: string }) => void;
    customization?: Customization;
  }

  let { onSubmit, customization = {} }: Props = $props();

  let name = $state('');
  let email = $state('');
  let subject = $state('');
  let message = $state('');
  let loading = $state(false);
  let success = $state(false);

  const t = $derived(getTokens(customization));

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

<div
  class="p-6"
  style="background-color: {t.cardBg}; border: 1px solid {t.borderColor}; border-radius: {t.radiusPx};"
>
  {#if success}
    <div class="p-4 mb-4 text-sm font-medium" style="background-color: {t.primaryLight}; color: {t.primaryColor}; border-radius: {t.radiusPx};">
      Thank you! Your message has been sent.
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1" style="color: {t.textColor};" for="contact-name">Name</label>
      <input
        id="contact-name"
        type="text"
        bind:value={name}
        required
        class="w-full px-3 py-2 text-sm outline-none transition-colors"
        style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
        placeholder="Your name"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" style="color: {t.textColor};" for="contact-email">Email</label>
      <input
        id="contact-email"
        type="email"
        bind:value={email}
        required
        class="w-full px-3 py-2 text-sm outline-none transition-colors"
        style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
        placeholder="your@email.com"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" style="color: {t.textColor};" for="contact-subject">Subject</label>
      <input
        id="contact-subject"
        type="text"
        bind:value={subject}
        required
        class="w-full px-3 py-2 text-sm outline-none transition-colors"
        style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
        placeholder="What's this about?"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" style="color: {t.textColor};" for="contact-message">Message</label>
      <textarea
        id="contact-message"
        bind:value={message}
        required
        rows={4}
        class="w-full px-3 py-2 text-sm outline-none transition-colors resize-none"
        style="border: 1px solid {t.borderColor}; border-radius: {t.radiusPx}; color: {t.textColor}; background-color: {t.bgColor};"
        placeholder="Your message..."
      ></textarea>
    </div>

    <button
      type="submit"
      disabled={loading}
      class="w-full {btnClasses(t)}"
      style="{btnStyle(t)} border-radius: {t.buttonStyle === 'rounded' ? '9999px' : t.radiusPx};"
    >
      {#if loading}
        Sending...
      {:else}
        Send Message
      {/if}
    </button>
  </form>
</div>
