<script lang="ts">
  import { Zap, Mail, MapPin, ArrowUpRight, Globe, MessageSquare } from '@lucide/svelte';

  const productLinks = [
    { label: 'Pricing', href: '/pricing' },
    { label: 'About', href: '/about' },
    { label: 'Get Started', href: '/register' },
  ];

  const resourceLinks = [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Changelog', href: '#' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ];
</script>

<footer class="border-t border-border bg-navy text-white">
  <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="grid gap-12 lg:grid-cols-5">
      <!-- Brand -->
      <div class="lg:col-span-2">
        <a href="/" class="group flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/20">
            <Zap class="h-4 w-4 text-emerald" stroke-width={2.5} />
          </div>
          <span class="text-xl font-bold tracking-tight">jamicore</span>
        </a>
        <p class="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
          The enterprise multi-tenant e-commerce platform built for modern merchants
          across the Middle East and beyond.
        </p>
        <div class="mt-6 flex items-center gap-4">
          <a href="#" class="rounded-lg bg-white/5 p-2.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
            <MessageSquare class="h-4 w-4" />
          </a>
          <a href="#" class="rounded-lg bg-white/5 p-2.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
            <Globe class="h-4 w-4" />
          </a>
          <a href="mailto:support@jamicore.com" class="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white">
            <Mail class="h-3.5 w-3.5" />
            support@jamicore.com
          </a>
        </div>
      </div>

      <!-- Links -->
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400">Product</h4>
        <ul class="mt-4 space-y-3">
          {#each productLinks as link}
            <li>
              <a href={link.href} class="group flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white">
                {link.label}
                <ArrowUpRight class="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          {/each}
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400">Resources</h4>
        <ul class="mt-4 space-y-3">
          {#each resourceLinks as link}
            <li>
              <a href={link.href} class="group flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white">
                {link.label}
                <ArrowUpRight class="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          {/each}
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400">Legal</h4>
        <ul class="mt-4 space-y-3">
          {#each legalLinks as link}
            <li>
              <a href={link.href} class="group flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white">
                {link.label}
                <ArrowUpRight class="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
      <p class="text-xs text-gray-500">
        &copy; {new Date().getFullYear()} jamicore. All rights reserved.
      </p>
      <span class="flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin class="h-3 w-3" />
        Dubai, UAE
      </span>
    </div>
  </div>
</footer>
