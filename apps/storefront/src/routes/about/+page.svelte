<script lang="ts">
	let { data } = $props();
	const store = $derived(data.store);
</script>

<svelte:head>
	<title>About - {store?.name || 'Store'}</title>
	<meta name="description" content="Learn more about {store?.name || 'our store'}" />
</svelte:head>

<!-- Hero -->
<section class="relative bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white py-24 px-6">
	<div class="max-w-4xl mx-auto text-center">
		<h1 class="text-4xl md:text-5xl font-bold mb-4">About {store?.name || 'Us'}</h1>
		<p class="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
			{store?.about || 'Welcome to our store. We are passionate about providing the best products and shopping experience to our customers.'}
		</p>
	</div>
</section>

<!-- Mission -->
<section class="py-16 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="grid md:grid-cols-2 gap-12 items-center">
			<div>
				<h2 class="text-2xl font-bold mb-4" style="color: var(--color-primary)">Our Mission</h2>
				<p class="text-[var(--color-text-secondary)] leading-relaxed">
					We believe in delivering exceptional quality and value. Every product in our catalog is carefully curated to meet the highest standards, ensuring you receive nothing but the best.
				</p>
				<p class="text-[var(--color-text-secondary)] leading-relaxed mt-4">
					Our commitment to customer satisfaction drives everything we do — from product selection to the moment your order arrives at your door.
				</p>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="p-6 rounded-2xl text-center" style="background: var(--color-surface); border: 1px solid var(--color-border)">
					<p class="text-3xl font-bold" style="color: var(--color-primary)">100%</p>
					<p class="text-sm mt-1" style="color: var(--color-text-secondary)">Quality Assured</p>
				</div>
				<div class="p-6 rounded-2xl text-center" style="background: var(--color-surface); border: 1px solid var(--color-border)">
					<p class="text-3xl font-bold" style="color: var(--color-primary)">24/7</p>
					<p class="text-sm mt-1" style="color: var(--color-text-secondary)">Customer Support</p>
				</div>
				<div class="p-6 rounded-2xl text-center" style="background: var(--color-surface); border: 1px solid var(--color-border)">
					<p class="text-3xl font-bold" style="color: var(--color-primary)">Fast</p>
					<p class="text-sm mt-1" style="color: var(--color-text-secondary)">Delivery</p>
				</div>
				<div class="p-6 rounded-2xl text-center" style="background: var(--color-surface); border: 1px solid var(--color-border)">
					<p class="text-3xl font-bold" style="color: var(--color-primary)">Easy</p>
					<p class="text-sm mt-1" style="color: var(--color-text-secondary)">Returns</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Contact -->
<section class="py-16 px-6" style="background: var(--color-surface)">
	<div class="max-w-4xl mx-auto text-center">
		<h2 class="text-2xl font-bold mb-4">Get in Touch</h2>
		<p class="text-[var(--color-text-secondary)] mb-8 max-w-xl mx-auto">
			Have questions or feedback? We'd love to hear from you.
		</p>
		<div class="flex flex-wrap justify-center gap-6">
			{#if store?.ownerEmail}
				<a href="mailto:{store.ownerEmail}" class="px-6 py-3 rounded-xl font-medium text-white transition-transform hover:scale-105" style="background: var(--color-primary)">
					Email Us
				</a>
			{/if}
			{#if store?.ownerPhone}
				<a href="tel:{store.ownerPhone}" class="px-6 py-3 rounded-xl font-medium transition-transform hover:scale-105" style="background: var(--color-bg); border: 2px solid var(--color-primary); color: var(--color-primary)">
					Call Us
				</a>
			{/if}
		</div>
	</div>
</section>
