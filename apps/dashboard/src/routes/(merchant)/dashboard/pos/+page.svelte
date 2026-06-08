<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import Search from '@lucide/svelte/icons/search';
	import Barcode from '@lucide/svelte/icons/barcode';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Banknote from '@lucide/svelte/icons/banknote';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Printer from '@lucide/svelte/icons/printer';
	import RotateCcw from '@lucide/svelte/icons/rotate-cw';
	import Package from '@lucide/svelte/icons/package';
	import X from '@lucide/svelte/icons/x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	let { data } = $props();
	let cashierName = $derived(data.cashierName);

	// ---- Cart state ----
	interface CartItem {
		productId: string;
		productName: string;
		variantId?: string;
		variantName?: string;
		sku?: string;
		quantity: number;
		price: number; // in cents
	}

	let cart: CartItem[] = $state([]);

	// ---- Product search state ----
	interface ProductVariant {
		id: string;
		name: string;
		sku?: string;
		price: number;
		stock: number;
	}

	interface ProductResult {
		id: string;
		name: string;
		variants?: ProductVariant[];
		thumbnail?: string;
	}

	let searchQuery = $state('');
	let barcodeInput = $state('');
	let products: ProductResult[] = $state([]);
	let searching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	// ---- Payment state ----
	type PaymentMethod = 'cash' | 'card' | 'upi';
	let paymentMethod: PaymentMethod = $state('cash');
	let amountTendered = $state('');
	let submitting = $state(false);

	const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
		{ value: 'cash', label: 'Cash', icon: Banknote },
		{ value: 'card', label: 'Card', icon: CreditCard },
		{ value: 'upi', label: 'UPI', icon: Smartphone },
	];

	// ---- Receipt state ----
	let showReceipt = $state(false);
	let receiptData: {
		orderNumber: string;
		items: CartItem[];
		subtotal: number;
		tax: number;
		total: number;
		paymentMethod: string;
		amountTendered?: number;
		change?: number;
		createdAt: string;
	} | null = $state(null);

	// ---- Derived ----
	let subtotal = $derived(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
	// Tax ~5% for display; actual calculation is server-side
	let tax = $derived(Math.round(subtotal * 0.05));
	let total = $derived(subtotal + tax);
	let itemCount = $derived(cart.reduce((sum, item) => sum + item.quantity, 0));

	let amountTenderedCents = $derived(amountTendered ? Math.round(parseFloat(amountTendered) * 100) : 0);
	let change = $derived(
		paymentMethod === 'cash' && amountTenderedCents > total ? amountTenderedCents - total : 0
	);
	let canCharge = $derived(cart.length > 0 && (paymentMethod !== 'cash' || amountTenderedCents >= total));

	// ---- Product search ----
	function doSearch(query: string) {
		if (!query || query.length < 1) {
			products = [];
			return;
		}
		searching = true;
		const params = new URLSearchParams({ search: query, limit: '20' });
		fetch(`/api/v1/merchant/pos/products?${params}`, { credentials: 'include' })
			.then((res) => (res.ok ? res.json() : { products: [] }))
			.then((data) => {
				products = data.products ?? data.items ?? [];
			})
			.catch(() => {
				products = [];
			})
			.finally(() => {
				searching = false;
			});
	}

	function onSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchQuery = value;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => doSearch(value), 300);
	}

	function onBarcodeInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		barcodeInput = value;
		if (value.length >= 5) {
			doSearch(value);
		}
	}

	// ---- Cart operations ----
	function addToCart(product: ProductResult, variant?: ProductVariant) {
		const existingIdx = cart.findIndex(
			(item) =>
				item.productId === product.id && (item.variantId ?? '') === (variant?.id ?? '')
		);
		if (existingIdx >= 0) {
			cart[existingIdx].quantity += 1;
			cart = [...cart]; // trigger reactivity
		} else {
			const price = variant?.price ?? 0;
			cart = [
				...cart,
				{
					productId: product.id,
					productName: product.name,
					variantId: variant?.id,
					variantName: variant?.name,
					sku: variant?.sku,
					quantity: 1,
					price,
				},
			];
		}
		toast.success(`Added ${product.name} to cart`);
	}

	function updateQty(index: number, delta: number) {
		const newQty = cart[index].quantity + delta;
		if (newQty <= 0) {
			removeItem(index);
		} else {
			cart[index].quantity = newQty;
			cart = [...cart];
		}
	}

	function removeItem(index: number) {
		cart = cart.filter((_, i) => i !== index);
	}

	function clearCart() {
		cart = [];
		amountTendered = '';
	}

	// ---- Charge ----
	async function charge() {
		if (!canCharge || submitting) return;
		submitting = true;

		const body = {
			items: cart.map((item) => ({
				productId: item.productId,
				variantId: item.variantId,
				quantity: item.quantity,
				price: item.price,
			})),
			paymentMethod,
			...(paymentMethod === 'cash' && amountTenderedCents > 0
				? { amountTendered: amountTenderedCents }
				: {}),
		};

		try {
			const res = await fetch('/api/v1/merchant/pos/orders', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Transaction failed' }));
				toast.error(err.message || 'Transaction failed');
				submitting = false;
				return;
			}

			const order = await res.json();
			receiptData = {
				orderNumber: order.orderNumber || order.id || '—',
				items: [...cart],
				subtotal,
				tax,
				total,
				paymentMethod,
				amountTendered: paymentMethod === 'cash' ? amountTenderedCents : undefined,
				change: paymentMethod === 'cash' && amountTenderedCents > total ? change : undefined,
				createdAt: new Date().toLocaleString(),
			};
			showReceipt = true;
			clearCart();
		} catch {
			toast.error('Network error. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function newSale() {
		showReceipt = false;
		receiptData = null;
		clearCart();
		searchQuery = '';
		barcodeInput = '';
		products = [];
	}

	function printReceipt() {
		window.print();
	}

	function formatCents(cents: number): string {
		return (cents / 100).toFixed(2);
	}
</script>

<div class="h-[calc(100vh-4rem)] flex flex-col">
	<!-- Top bar -->
	<div class="flex items-center justify-between px-4 py-3 border-b bg-card">
		<div class="flex items-center gap-3">
			<h1 class="text-lg font-semibold">Point of Sale</h1>
			<Badge variant="outline" class="text-xs">{cashierName}</Badge>
		</div>
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<span>{itemCount} items</span>
			<span>|</span>
			<span>Total: ${formatCents(total)}</span>
		</div>
	</div>

	<!-- Main two-column area -->
	<div class="flex-1 flex overflow-hidden">
		<!-- LEFT: Product search & results -->
		<div class="w-1/2 flex flex-col border-r">
			<!-- Search bar -->
			<div class="flex gap-2 p-3 border-b">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						class="pl-9"
						placeholder="Search products by name, SKU, or barcode..."
						value={searchQuery}
						oninput={onSearchInput}
					/>
				</div>
				<div class="relative w-40">
					<Barcode class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						class="pl-9"
						placeholder="Barcode"
						value={barcodeInput}
						oninput={onBarcodeInput}
					/>
				</div>
			</div>

			<!-- Product results -->
			<div class="flex-1 overflow-y-auto p-3">
				{#if searching}
					<div class="flex items-center justify-center py-12">
						<LoaderCircle class="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				{:else if products.length === 0 && searchQuery.length > 0}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
						<Package class="w-10 h-10 mb-2 opacity-40" />
						<p>No products found</p>
						<p class="text-sm">Try a different search term</p>
					</div>
				{:else if products.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
						<Search class="w-10 h-10 mb-2 opacity-40" />
						<p>Search for products to add to cart</p>
						<p class="text-sm">Type a name, SKU, or scan a barcode</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-2">
						{#each products as product (product.id)}
							<Card class="hover:shadow-md transition-shadow cursor-pointer">
								<CardContent class="p-3">
									<div class="flex items-center justify-between gap-3">
										<div class="flex-1 min-w-0">
											<p class="font-medium text-sm truncate">{product.name}</p>
											{#if product.variants && product.variants.length > 1}
												<div class="mt-2 space-y-1">
													{#each product.variants as variant (variant.id)}
														<div class="flex items-center justify-between gap-2 px-2 py-1 rounded bg-muted/50">
															<div class="min-w-0">
																<p class="text-xs font-medium truncate">{variant.name}</p>
																{#if variant.sku}
																	<p class="text-xs text-muted-foreground">{variant.sku}</p>
																{/if}
															</div>
															<div class="flex items-center gap-2 shrink-0">
																<span class="text-xs font-medium">${formatCents(variant.price)}</span>
																<Button
																	size="icon"
																	variant="ghost"
																	class="w-7 h-7"
																	disabled={variant.stock <= 0}
																	onclick={() => addToCart(product, variant)}
																>
																	<Plus class="w-3.5 h-3.5" />
																</Button>
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
										{#if (!product.variants || product.variants.length <= 1) && product.variants?.[0]}
											<Button
												size="sm"
												variant="outline"
												disabled={product.variants![0].stock <= 0}
												onclick={() => addToCart(product, product.variants![0])}
											>
												<Plus class="w-3.5 h-3.5 mr-1" />
												Add
											</Button>
										{/if}
									</div>
								</CardContent>
							</Card>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- RIGHT: Cart -->
		<div class="w-1/2 flex flex-col bg-muted/30">
			<!-- Cart header -->
			<div class="flex items-center justify-between p-3 border-b border-border">
				<div class="flex items-center gap-2">
					<ShoppingCart class="w-4 h-4" />
					<h2 class="font-semibold text-sm">Cart ({itemCount})</h2>
				</div>
				{#if cart.length > 0}
					<Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" onclick={clearCart}>
						<Trash2 class="w-3.5 h-3.5 mr-1" />
						Clear
					</Button>
				{/if}
			</div>

			<!-- Cart items -->
			<div class="flex-1 overflow-y-auto p-3">
				{#if cart.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<ShoppingCart class="w-10 h-10 mb-2 opacity-40" />
						<p>Cart is empty</p>
						<p class="text-sm">Search and add products from the left panel</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each cart as item, index (item.productId + (item.variantId ?? ''))}
							<div class="flex items-center gap-2 p-2 rounded-lg bg-card border">
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium truncate">{item.productName}</p>
									{#if item.variantName}
										<p class="text-xs text-muted-foreground">{item.variantName}</p>
									{/if}
									<p class="text-xs text-muted-foreground">${formatCents(item.price)}</p>
								</div>
								<div class="flex items-center gap-1 shrink-0">
									<Button size="icon" variant="outline" class="w-7 h-7" onclick={() => updateQty(index, -1)}>
										<Minus class="w-3 h-3" />
									</Button>
									<span class="w-7 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
									<Button size="icon" variant="outline" class="w-7 h-7" onclick={() => updateQty(index, 1)}>
										<Plus class="w-3 h-3" />
									</Button>
									<Button size="icon" variant="ghost" class="w-7 h-7 text-destructive hover:text-destructive" onclick={() => removeItem(index)}>
										<X class="w-3.5 h-3.5" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Totals & Payment -->
			<div class="border-t border-border bg-card p-3 space-y-3">
				<!-- Totals -->
				<div class="space-y-1 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Subtotal</span>
						<span class="font-medium tabular-nums">${formatCents(subtotal)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Tax</span>
						<span class="font-medium tabular-nums">${formatCents(tax)}</span>
					</div>
					<div class="flex justify-between text-base font-bold pt-1 border-t">
						<span>Total</span>
						<span class="tabular-nums">${formatCents(total)}</span>
					</div>
				</div>

				<!-- Payment method toggle -->
				<div class="flex gap-1">
					{#each paymentMethods as method}
						<button
							type="button"
							class="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-sm font-medium border transition-colors
								{paymentMethod === method.value
									? 'bg-primary text-primary-foreground border-primary'
									: 'bg-background hover:bg-muted border-border'}"
							onclick={() => { paymentMethod = method.value; amountTendered = ''; }}
						>
							<method.icon class="w-3.5 h-3.5" />
							{method.label}
						</button>
					{/each}
				</div>

				<!-- Cash: amount tendered -->
				{#if paymentMethod === 'cash'}
					<div>
						<label for="pos-amount-tendered" class="text-xs text-muted-foreground mb-1 block">Amount Tendered</label>
						<div class="relative">
							<DollarSign class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								class="pl-9"
								type="number"
								placeholder="0.00"
								step="0.01"
								min="0"
								value={amountTendered}
								oninput={(e) => (amountTendered = (e.target as HTMLInputElement).value)}
							/>
						</div>
						{#if amountTenderedCents > 0 && amountTenderedCents >= total}
							<p class="text-xs text-success mt-1">Change: ${formatCents(change)}</p>
						{/if}
					</div>
				{/if}

				<!-- Charge button -->
				<Button
					class="w-full"
					size="lg"
					disabled={!canCharge || submitting}
					onclick={charge}
				>
					{#if submitting}
						<LoaderCircle class="w-4 h-4 mr-2 animate-spin" />
					{/if}
					Charge ${formatCents(total)}
				</Button>
			</div>
		</div>
	</div>
</div>

<!-- Receipt Modal -->
<Dialog.Root open={showReceipt} onOpenChange={(v) => (showReceipt = v)}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Order Complete</Dialog.Title>
			<Dialog.Description>Transaction processed successfully</Dialog.Description>
		</Dialog.Header>
		{#if receiptData}
			<div class="space-y-3 py-2 text-sm" id="receipt-content">
				<div class="text-center border-b pb-2">
					<p class="font-bold text-base">Receipt</p>
					<p class="text-xs text-muted-foreground">{receiptData.createdAt}</p>
					<p class="text-xs font-mono text-muted-foreground">Order: {receiptData.orderNumber}</p>
				</div>

				<div class="space-y-1.5 border-b pb-2">
					{#each receiptData.items as item}
						<div class="flex justify-between text-xs">
							<span class="truncate flex-1">
								{item.productName}
								{#if item.variantName} ({item.variantName}){/if}
								<span class="text-muted-foreground"> x{item.quantity}</span>
							</span>
							<span class="ml-2 tabular-nums">${formatCents(item.price * item.quantity)}</span>
						</div>
					{/each}
				</div>

				<div class="space-y-1">
					<div class="flex justify-between text-xs">
						<span class="text-muted-foreground">Subtotal</span>
						<span class="tabular-nums">${formatCents(receiptData.subtotal)}</span>
					</div>
					<div class="flex justify-between text-xs">
						<span class="text-muted-foreground">Tax</span>
						<span class="tabular-nums">${formatCents(receiptData.tax)}</span>
					</div>
					<div class="flex justify-between font-bold">
						<span>Total</span>
						<span class="tabular-nums">${formatCents(receiptData.total)}</span>
					</div>
					<div class="flex justify-between text-xs">
						<span class="text-muted-foreground">Payment</span>
						<span>{receiptData.paymentMethod.toUpperCase()}</span>
					</div>
					{#if receiptData.amountTendered !== undefined}
						<div class="flex justify-between text-xs">
							<span class="text-muted-foreground">Tendered</span>
							<span class="tabular-nums">${formatCents(receiptData.amountTendered)}</span>
						</div>
						{#if receiptData.change !== undefined}
							<div class="flex justify-between text-xs font-bold text-success">
								<span>Change</span>
								<span class="tabular-nums">${formatCents(receiptData.change)}</span>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
		<Dialog.Footer class="flex gap-2">
			<Button variant="outline" class="flex-1" onclick={printReceipt}>
				<Printer class="w-4 h-4 mr-2" />
				Print
			</Button>
			<Button class="flex-1" onclick={newSale}>
				<RotateCcw class="w-4 h-4 mr-2" />
				New Sale
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
