<script lang="ts">
  interface Step {
    label: string;
    href: string;
  }

  interface Props {
    steps: Step[];
    currentStep: number;
  }

  let { steps, currentStep }: Props = $props();
</script>

<nav class="flex items-center justify-center mb-8" aria-label="Checkout progress">
  {#each steps as step, i (step.label)}
    <div class="flex items-center">
      <a
        href={i < currentStep ? step.href : undefined}
        class="flex items-center gap-2 {i <= currentStep
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-text-secondary)]'} {i < currentStep ? 'cursor-pointer hover:underline' : ''}"
        aria-current={i === currentStep ? 'step' : undefined}
      >
        <span
          class="flex items-center justify-center size-8 rounded-full text-sm font-medium border-2 transition-colors {i < currentStep
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : i === currentStep
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}"
        >
          {#if i < currentStep}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
          {:else}
            {i + 1}
          {/if}
        </span>
        <span class="text-sm font-medium hidden sm:inline">{step.label}</span>
      </a>
      {#if i < steps.length - 1}
        <div
          class="w-8 sm:w-16 h-0.5 mx-2 {i < currentStep
            ? 'bg-[var(--color-primary)]'
            : 'bg-[var(--color-border)]'}"
        ></div>
      {/if}
    </div>
  {/each}
</nav>