<script lang="ts">
  import { Zap, Mail, MapPin, ArrowUpRight } from '@lucide/svelte';

  const links = {
    product: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'About', href: '/about' },
      { label: 'Get Started', href: '/register' },
    ],
    resources: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  };
</script>

<footer class="relative border-t border-border/30">
  <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="grid gap-12 lg:grid-cols-5">
      <!-- Brand -->
      <div class="lg:col-span-2">
        <a href="/" class="group flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Zap class="h-4 w-4 text-accent" stroke-width={2.5} />
          </div>
          <span class="font-serif text-xl font-semibold text-foreground">jamicore</span>
        </a>
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
          The headless multi-tenant e-commerce platform built for merchants who demand
          speed, flexibility, and control.
        </p>
        <div class="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span class="flex items-center gap-1.5">
            <Mail class="h-3.5 w-3.5" />
            support@jamicore.com
          </span>
        </div>
      </div>

      <!-- Links -->
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Product
        </h4>
        <ul class="mt-4 space-y-3">
          {#each links.product as link}
            <li>
              <a
                href={link.href}
                class="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
                <ArrowUpRight class="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          {/each}
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resources
        </h4>
        <ul class="mt-4 space-y-3">
          {#each links.resources as link}
            <li>
              <a
                href={link.href}
                class="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
                <ArrowUpRight class="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          {/each}
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Legal
        </h4>
        <ul class="mt-4 space-y-3">
          {#each links.legal as link}
            <li>
              <a
                href={link.href}
                class="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
                <ArrowUpRight class="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 sm:flex-row">
      <p class="text-xs text-muted-foreground">
        © {new Date().getFullYear()} jamicore. Crafted with intention.
      </p>
      <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin class="h-3 w-3" />
        Tamil Nadu, India
      </span>
    </div>
  </div>
</footer>
