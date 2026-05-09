<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import Clock from '@lucide/svelte/icons/clock';
	import Mail from '@lucide/svelte/icons/mail';
	import LogOut from '@lucide/svelte/icons/log-out';

	let { data } = $props();
</script>

<svelte:head>
	<title>Pending Approval</title>
</svelte:head>

<div class="w-full max-w-md">
	<Card>
		<CardHeader class="space-y-1 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
				<Clock class="h-8 w-8 text-amber-500" />
			</div>
			<CardTitle class="text-2xl">Pending Approval</CardTitle>
			<CardDescription>
				Your account is under review
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			<p class="text-sm text-muted-foreground text-center leading-relaxed">
				Your store <strong class="text-foreground">{data.store?.name || ''}</strong> has been registered successfully and is pending approval from our team. You will receive an email once your account is activated.
			</p>

			<div class="rounded-lg bg-muted p-4 space-y-3">
				<div class="flex items-start gap-3">
					<Mail class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
					<div class="text-sm">
						<p class="font-medium">What happens next?</p>
						<p class="text-muted-foreground mt-1">Our team typically reviews new registrations within 24 hours. You'll get an email notification once approved.</p>
					</div>
				</div>
			</div>

			<Separator />

			<form method="POST" action="/logout" class="w-full">
				<Button variant="outline" type="submit" class="w-full gap-2">
					<LogOut class="h-4 w-4" />
					Sign Out
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
