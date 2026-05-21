<script lang="ts">
  import { Rocket, Mail, MapPin } from '@lucide/svelte';
</script>

<footer class="border-t border-border bg-card">
  <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <a href="/" class="flex items-center gap-2 text-lg font-bold text-foreground">
          <Rocket class="h-5 w-5 text-accent" />
          jamicore
        </a>
        <p class="mt-3 text-sm text-muted-foreground">
          The complete headless e-commerce platform for modern merchants.
        </p>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-foreground">Product</h3>
        <ul class="mt-3 space-y-2">
          <li><a href="/pricing" class="text-sm text-muted-foreground hover:text-foreground">Pricing</a></li>
          <li><a href="/about" class="text-sm text-muted-foreground hover:text-foreground">About</a></li>
          <li><a href="/register" class="text-sm text-muted-foreground hover:text-foreground">Get Started</a></li>
        </ul>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-foreground">Resources</h3>
        <ul class="mt-3 space-y-2">
          <li><span class="text-sm text-muted-foreground">Documentation</span></li>
          <li><span class="text-sm text-muted-foreground">API Reference</span></li>
          <li><span class="text-sm text-muted-foreground">Changelog</span></li>
        </ul>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-foreground">Contact</h3>
        <ul class="mt-3 space-y-2">
          <li class="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail class="h-4 w-4" />
            support@jamicore.com
          </li>
          <li class="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin class="h-4 w-4" />
            Tamil Nadu, India
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
      © {new Date().getFullYear()} jamicore. All rights reserved.
    </div>
  </div>
</footer>
