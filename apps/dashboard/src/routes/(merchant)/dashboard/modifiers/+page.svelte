<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
		import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';

	let { data } = $props();

	let showGroupDialog = $state(false);
	let showOptionDialog = $state(false);
	let editingGroup = $state<any>(null);
	let editingOption = $state<any>(null);
	let activeGroupId = $state<string | null>(null);
	let saving = $state(false);

	let groupForm = $state({ nameEn: '', nameAr: '', isRequired: false, minSelections: '0', maxSelections: '1' });
	let optionForm = $state({ nameEn: '', nameAr: '', priceAdjustment: '0', isDefault: false });

	function openCreateGroup() {
		editingGroup = null;
		groupForm = { nameEn: '', nameAr: '', isRequired: false, minSelections: '0', maxSelections: '1' };
		showGroupDialog = true;
	}

	function openEditGroup(group: any) {
		editingGroup = group;
		groupForm = {
			nameEn: group.nameEn, nameAr: group.nameAr || '',
			isRequired: group.isRequired ?? false,
			minSelections: String(group.minSelections || 0),
			maxSelections: String(group.maxSelections || 1),
		};
		showGroupDialog = true;
	}

	function openCreateOption(groupId: string) {
		activeGroupId = groupId;
		editingOption = null;
		optionForm = { nameEn: '', nameAr: '', priceAdjustment: '0', isDefault: false };
		showOptionDialog = true;
	}

	function openEditOption(groupId: string, option: any) {
		activeGroupId = groupId;
		editingOption = option;
		optionForm = {
			nameEn: option.nameEn, nameAr: option.nameAr || '',
			priceAdjustment: String(option.priceAdjustment || 0),
			isDefault: option.isDefault ?? false,
		};
		showOptionDialog = true;
	}

	async function saveGroup() {
		if (!groupForm.nameEn.trim()) { toast.error('Name required'); return; }
		saving = true;
		try {
			const payload = {
				nameEn: groupForm.nameEn, nameAr: groupForm.nameAr || undefined,
				isRequired: groupForm.isRequired,
				minSelections: Number(groupForm.minSelections),
				maxSelections: Number(groupForm.maxSelections),
			};
			if (editingGroup) {
				await apiFetch(`/merchant/modifiers/${editingGroup.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
				toast.success('Group updated');
			} else {
				await apiFetch('/merchant/modifiers', { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Group created');
			}
			showGroupDialog = false;
			invalidateAll();
		} catch (err: any) { toast.error(err?.message || 'Failed'); }
		finally { saving = false; }
	}

	async function saveOption() {
		if (!optionForm.nameEn.trim() || !activeGroupId) { toast.error('Name required'); return; }
		saving = true;
		try {
			const payload = {
				nameEn: optionForm.nameEn, nameAr: optionForm.nameAr || undefined,
				priceAdjustment: optionForm.priceAdjustment,
				isDefault: optionForm.isDefault,
			};
			if (editingOption) {
				await apiFetch(`/merchant/modifiers/${activeGroupId}/options/${editingOption.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
				toast.success('Option updated');
			} else {
				await apiFetch(`/merchant/modifiers/${activeGroupId}/options`, { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Option added');
			}
			showOptionDialog = false;
			invalidateAll();
		} catch (err: any) { toast.error(err?.message || 'Failed'); }
		finally { saving = false; }
	}

	async function deleteGroup(id: string) {
		if (!confirm('Delete this modifier group and all its options?')) return;
		try { await apiFetch(`/merchant/modifiers/${id}`, { method: 'DELETE' }); toast.success('Deleted'); invalidateAll(); }
		catch { toast.error('Failed'); }
	}

	async function deleteOption(groupId: string, optionId: string) {
		if (!confirm('Delete this option?')) return;
		try { await apiFetch(`/merchant/modifiers/${groupId}/options/${optionId}`, { method: 'DELETE' }); toast.success('Deleted'); invalidateAll(); }
		catch { toast.error('Failed'); }
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Modifiers</h1>
			<p class="text-muted-foreground">Manage add-ons and customization options for products</p>
		</div>
		<Button onclick={openCreateGroup} class="gap-2"><Plus class="w-4 h-4" />Add Group</Button>
	</div>

	{#if !data.groups || data.groups.length === 0}
		<Card>
			<CardContent class="py-16 text-center text-muted-foreground">
				<SlidersHorizontal class="w-12 h-12 mx-auto mb-3 opacity-50" />
				<p class="text-lg font-medium">No modifier groups yet</p>
				<p class="text-sm mt-1">Create groups like "Size", "Extras", "Toppings" etc.</p>
				<Button onclick={openCreateGroup} class="mt-4 gap-2"><Plus class="w-4 h-4" />Add Group</Button>
			</CardContent>
		</Card>
	{:else}
		{#each data.groups as group (group.id)}
			<Card>
				<CardHeader class="flex flex-row items-center justify-between">
					<div class="flex items-center gap-3">
						<GripVertical class="w-4 h-4 text-muted-foreground" />
						<div>
							<CardTitle class="text-base">{group.nameEn}</CardTitle>
							<CardDescription>
								{group.isRequired ? 'Required' : 'Optional'} · 
								Select {group.minSelections}–{group.maxSelections}
								{#if group.nameAr}
									<span dir="rtl" class="ml-2">({group.nameAr})</span>
								{/if}
							</CardDescription>
						</div>
					</div>
					<div class="flex items-center gap-1">
						<Button variant="outline" size="sm" onclick={() => openCreateOption(group.id)} class="gap-1">
							<Plus class="w-3 h-3" />Option
						</Button>
						<button onclick={() => openEditGroup(group)} class="p-1.5 rounded hover:bg-muted">
							<Pencil class="w-4 h-4 text-muted-foreground" />
						</button>
						<button onclick={() => deleteGroup(group.id)} class="p-1.5 rounded hover:bg-destructive/10">
							<Trash2 class="w-4 h-4 text-destructive" />
						</button>
					</div>
				</CardHeader>
				{#if group.options && group.options.length > 0}
					<CardContent class="pt-0">
						<div class="space-y-2">
							{#each group.options as option (option.id)}
								<div class="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
									<div class="flex items-center gap-3">
										<span class="font-medium text-sm">{option.nameEn}</span>
										{#if option.nameAr}
											<span class="text-xs text-muted-foreground" dir="rtl">{option.nameAr}</span>
										{/if}
										{#if option.isDefault}
											<Badge variant="secondary" class="text-xs">Default</Badge>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										{#if Number(option.priceAdjustment) !== 0}
											<span class="text-sm font-medium text-primary">
												{Number(option.priceAdjustment) > 0 ? '+' : ''}${Number(option.priceAdjustment).toFixed(2)}
											</span>
										{/if}
										<button onclick={() => openEditOption(group.id, option)} class="p-1 rounded hover:bg-muted">
											<Pencil class="w-3.5 h-3.5 text-muted-foreground" />
										</button>
										<button onclick={() => deleteOption(group.id, option.id)} class="p-1 rounded hover:bg-destructive/10">
											<Trash2 class="w-3.5 h-3.5 text-destructive" />
										</button>
									</div>
								</div>
							{/each}
						</div>
					</CardContent>
				{:else}
					<CardContent class="pt-0">
						<p class="text-sm text-muted-foreground text-center py-4">No options yet — add one above</p>
					</CardContent>
				{/if}
			</Card>
		{/each}
	{/if}
</div>

<!-- Group Dialog -->
<Dialog.Root bind:open={showGroupDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header><Dialog.Title>{editingGroup ? 'Edit Group' : 'Create Group'}</Dialog.Title></Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); saveGroup(); }} class="space-y-4">
			<div class="space-y-2"><Label for="gNameEn">Name (English) *</Label><Input id="gNameEn" bind:value={groupForm.nameEn} placeholder="e.g. Size" required /></div>
			<div class="space-y-2"><Label for="gNameAr">Name (Arabic)</Label><Input id="gNameAr" bind:value={groupForm.nameAr} dir="rtl" /></div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2"><Label for="minSel">Min Selections</Label><Input id="minSel" type="number" min="0" bind:value={groupForm.minSelections} /></div>
				<div class="space-y-2"><Label for="maxSel">Max Selections</Label><Input id="maxSel" type="number" min="1" bind:value={groupForm.maxSelections} /></div>
			</div>
			<div class="flex items-center justify-between"><Label>Required</Label><Switch bind:checked={groupForm.isRequired} /></div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showGroupDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Option Dialog -->
<Dialog.Root bind:open={showOptionDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header><Dialog.Title>{editingOption ? 'Edit Option' : 'Add Option'}</Dialog.Title></Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); saveOption(); }} class="space-y-4">
			<div class="space-y-2"><Label for="oNameEn">Name (English) *</Label><Input id="oNameEn" bind:value={optionForm.nameEn} placeholder="e.g. Large" required /></div>
			<div class="space-y-2"><Label for="oNameAr">Name (Arabic)</Label><Input id="oNameAr" bind:value={optionForm.nameAr} dir="rtl" /></div>
			<div class="space-y-2"><Label for="priceAdj">Price Adjustment</Label><Input id="priceAdj" type="number" step="0.01" bind:value={optionForm.priceAdjustment} /></div>
			<div class="flex items-center justify-between"><Label>Default</Label><Switch bind:checked={optionForm.isDefault} /></div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showOptionDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
