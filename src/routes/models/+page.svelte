<script lang="ts">
	import { Cpu } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { modelLibraryStore } from '$lib/stores';
	import type { TilekitModelEntry } from '$lib/types/tilekit';
	import { onMount } from 'svelte';

	onMount(() => {
		void modelLibraryStore.refresh();
	});

	let library = $derived(modelLibraryStore);
	let status = $derived(library.status);
	let progress = $derived(library.progress);
	let current = $derived(library.downloadingModel);

	/** decimal units, the way the cli and finder count */
	function size(bytes: number | null | undefined): string {
		if (!bytes) return '—';

		return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
	}

	function fitLabel(entry: TilekitModelEntry): string {
		if (!status?.device) return 'Runs on your CPU';

		switch (entry.fit) {
			case 'experts_on_cpu':
				return 'Runs with its experts on the CPU';
			case 'fits':
				return 'Fits your GPU';
			case 'too_big':
				return 'Too big for your GPU, runs slowly';
			default:
				return '';
		}
	}

	function stateLabel(entry: TilekitModelEntry): string {
		if (entry.state === 'ready') return `${size(entry.download_bytes)} · Downloaded`;

		if (entry.state === 'partial') {
			return `${size(entry.downloaded_bytes)} of ${size(entry.download_bytes)}`;
		}

		return size(entry.download_bytes);
	}

	let eta = $derived.by(() => {
		if (!progress?.bytes_per_sec) return '';

		const seconds =
			Math.max(progress.total_bytes - progress.done_bytes, 0) / progress.bytes_per_sec;
		const minutes = Math.floor(seconds / 60);

		return minutes > 0
			? `${minutes}m ${Math.round(seconds % 60)}s left`
			: `${Math.round(seconds)}s left`;
	});
</script>

<svelte:head>
	<title>Models | Tiles</title>
</svelte:head>

<main class="min-h-dvh px-5 pt-20 pb-32 sm:px-8 md:pt-24 lg:px-12">
	<div class="mx-auto w-full max-w-3xl">
		<h1 class="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Models</h1>

		<p class="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
			Tiles runs its model on this machine, so your chats never leave it.
			{#if status?.device}
				Sized for your {status.device.name}{#if status.disk}, with {size(status.disk.free_bytes)} free
					on disk{/if}.
			{/if}
		</p>

		{#if !status}
			<div class="mt-12 h-40 animate-pulse rounded-lg bg-secondary/65"></div>
		{:else}
			{#if library.downloading && progress}
				<section class="mt-12 rounded-lg bg-secondary/65 p-5" role="status">
					<div class="flex items-center justify-between gap-4">
						<div class="min-w-0">
							<span class="block text-[17px] leading-5 font-medium text-foreground">
								Downloading {current?.label ?? progress.spec}
							</span>

							<span class="mt-1 block text-sm text-muted-foreground tabular-nums">
								{size(progress.done_bytes)} of {size(progress.total_bytes)}
								{#if progress.bytes_per_sec}
									· {size(progress.bytes_per_sec)}/s · {eta}
								{/if}
							</span>
						</div>

						<Button onclick={() => modelLibraryStore.cancel()} size="sm" variant="outline">
							Pause
						</Button>
					</div>

					<div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-background">
						<div
							class="h-full bg-signal transition-[width] duration-300"
							style="width: {library.percent}%"
						></div>
					</div>
				</section>
			{/if}

			<div class="mt-12 overflow-hidden rounded-lg bg-secondary/65">
				{#each status.models as entry (entry.id)}
					{@const isActive = entry.active && entry.state === 'ready'}
					{@const isDownloading = library.downloading && progress?.spec === entry.spec}

					<div
						class="flex min-h-19 items-center gap-3 border-b border-border/55 px-4 py-4 last:border-b-0"
					>
						<span
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm ring-1 ring-border/60"
						>
							<Cpu aria-hidden="true" class="h-5 w-5" />
						</span>

						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-2">
								<span class="truncate text-[17px] leading-5 font-medium text-foreground">
									{entry.label}
								</span>

								{#if entry.recommended}
									<span class="text-[10px] font-medium tracking-wide text-signal uppercase">
										Recommended
									</span>
								{/if}
							</span>

							<span class="mt-0.5 block truncate text-sm leading-5 text-muted-foreground">
								{fitLabel(entry)} · {stateLabel(entry)}
							</span>
						</span>

						{#if isActive}
							<span
								class="shrink-0 rounded-full bg-background px-2.5 py-0.5 text-xs text-foreground ring-1 ring-border/60"
							>
								Active
							</span>
						{:else if isDownloading}
							<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
								{Math.floor(library.percent)}%
							</span>
						{:else if entry.state === 'ready'}
							<Button
								disabled={library.selecting}
								onclick={() => modelLibraryStore.use(entry.id)}
								size="sm"
							>
								Use
							</Button>
						{:else if entry.state === 'partial'}
							<Button
								disabled={library.downloading}
								onclick={() => modelLibraryStore.download(entry.id)}
								size="sm"
								variant="outline"
							>
								Continue
							</Button>
						{:else}
							<Button
								disabled={library.downloading}
								onclick={() => modelLibraryStore.download(entry.id)}
								size="sm"
								variant="outline"
							>
								Download
							</Button>
						{/if}
					</div>
				{/each}
			</div>

			{#if library.confirmReplace && library.selected}
				<div
					class="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border p-4"
				>
					<span class="text-sm text-muted-foreground">
						Your modelfile has edits of your own. Switching to {library.selected.label} replaces it.
					</span>

					<Button onclick={() => modelLibraryStore.use(library.selected?.id, true)} size="sm">
						Replace
					</Button>
				</div>
			{/if}

			{#if library.error}
				<p class="mt-4 text-sm text-destructive">{library.error}</p>
			{/if}
		{/if}
	</div>
</main>
