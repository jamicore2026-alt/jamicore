<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { errorMessage } from '$lib/utils';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Image from '@lucide/svelte/icons/image';

	interface Props {
		images?: string[];
		onChange?: (images: string[]) => void;
		maxImages?: number;
	}

	let { images = $bindable([]), onChange, maxImages = 10 }: Props = $props();

	let uploading = $state<string[]>([]);
	let dragOver = $state(false);
	let dragIndex = $state<number | null>(null);

	function triggerChange() {
		onChange?.(images);
	}

	async function uploadFile(file: File) {
		const id = crypto.randomUUID();
		uploading = [...uploading, id];

		try {
			const formData = new FormData();
			formData.append('file', file);

			const data = await apiFetch<{ file: { url: string } }>('/merchant/upload', {
				method: 'POST',
				body: formData,
			});
			const url = data.file?.url;
			if (!url) throw new Error('No URL returned');

			images = [...images, url];
			triggerChange();
		} catch (err) {
			toast.error(errorMessage(err) || 'Failed to upload image');
		} finally {
			uploading = uploading.filter((u) => u !== id);
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;
		processFiles(files);
		input.value = '';
	}

	function processFiles(files: FileList) {
		const available = maxImages - images.length - uploading.length;
		if (available <= 0) {
			toast.error(`Maximum ${maxImages} images allowed`);
			return;
		}

		const toUpload = Array.from(files).slice(0, available);
		for (const file of toUpload) {
			if (!file.type.startsWith('image/')) {
				toast.error(`${file.name} is not an image`);
				continue;
			}
			if (file.size > 10 * 1024 * 1024) {
				toast.error(`${file.name} exceeds 10MB limit`);
				continue;
			}
			uploadFile(file);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const files = e.dataTransfer?.files;
		if (files) processFiles(files);
	}

	async function removeImage(index: number) {
		const url = images[index];
		images = images.filter((_, i) => i !== index);
		triggerChange();

		// Delete from server
		try {
			await apiFetch(`/merchant/upload?url=${encodeURIComponent(url)}`, {
				method: 'DELETE',
			});
		} catch {
			// Silently fail — the image may still be referenced elsewhere
		}
	}

	function moveImage(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= images.length) return;
		const newImages = [...images];
		const temp = newImages[index];
		newImages[index] = newImages[newIndex];
		newImages[newIndex] = temp;
		images = newImages;
		triggerChange();
	}

	function handleDragStart(e: DragEvent, index: number) {
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === index) return;
		const newImages = [...images];
		const item = newImages.splice(dragIndex, 1)[0];
		newImages.splice(index, 0, item);
		images = newImages;
		dragIndex = index;
	}

	function handleDragEnd() {
		dragIndex = null;
		triggerChange();
	}
</script>

<div class="space-y-3">
	<!-- Upload area -->
	{#if images.length + uploading.length < maxImages}
		<div
			class="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
				{dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'}"
			onclick={() => document.getElementById('image-upload-input')?.click()}
			ondrop={handleDrop}
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => dragOver = false}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && document.getElementById('image-upload-input')?.click()}
		>
			<input
				id="image-upload-input"
				type="file"
				accept="image/*"
				multiple
				class="hidden"
				onchange={handleFileSelect}
			/>
			<div class="flex flex-col items-center gap-2">
				<div class="p-2 rounded-full bg-muted">
					<Upload class="w-5 h-5 text-muted-foreground" />
				</div>
				<p class="text-sm font-medium">Click to upload or drag and drop</p>
				<p class="text-xs text-muted-foreground">PNG, JPG, WebP, GIF up to 10MB each</p>
				<p class="text-xs text-muted-foreground">{images.length + uploading.length} / {maxImages}</p>
			</div>
		</div>
	{/if}

	<!-- Image grid -->
	{#if images.length > 0 || uploading.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
			{#each images as url, index (url)}
				<div
					class="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted
						{dragIndex === index ? 'ring-2 ring-primary' : ''}"
					role="listitem"
				draggable="true"
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragend={handleDragEnd}
				>
					<img
						src={url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`}
						alt=""
						class="w-full h-full object-cover"
						loading="lazy"
					/>

					<!-- Hover overlay -->
					<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
						flex flex-col items-center justify-center gap-1.5">
						{#if index > 0}
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7 text-white hover:bg-white/20"
								onclick={(e) => { e.stopPropagation(); moveImage(index, 'up'); }}
							>
								<ArrowUp class="w-4 h-4" />
							</Button>
						{/if}
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7 text-white hover:bg-white/20"
							onclick={(e) => { e.stopPropagation(); removeImage(index); }}
						>
							<X class="w-4 h-4" />
						</Button>
						{#if index < images.length - 1}
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7 text-white hover:bg-white/20"
								onclick={(e) => { e.stopPropagation(); moveImage(index, 'down'); }}
							>
								<ArrowDown class="w-4 h-4" />
							</Button>
						{/if}
					</div>

					<!-- Drag handle -->
					<div class="absolute top-1 left-1 p-1 rounded bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
						<GripVertical class="w-3 h-3 text-white" />
					</div>

					<!-- Index badge -->
					<div class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white font-mono">
						{index + 1}
					</div>
				</div>
			{/each}

			<!-- Uploading placeholders -->
			{#each uploading as _id}
				<div class="aspect-square rounded-lg border border-border bg-muted flex items-center justify-center">
					<Loader2 class="w-5 h-5 text-muted-foreground animate-spin" />
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
			<Image class="w-8 h-8 mb-2 opacity-40" />
			<p class="text-sm">No images yet</p>
			<p class="text-xs">Upload product images to attract customers</p>
		</div>
	{/if}
</div>
