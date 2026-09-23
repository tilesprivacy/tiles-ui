<script lang="ts">
	import OnboardingSteps from './OnboardingSteps.svelte';
	import { Logo } from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { onboardingStore } from '$lib/stores';
	import type { TilekitModelEntry } from '$lib/types/tilekit';
	import { onMount } from 'svelte';

	interface Props {
		/** part of the new-account flow, rather than a model gone missing later */
		inFlow?: boolean;
	}

	let { inFlow = false }: Props = $props();

	onMount(() => {
		if (!onboardingStore.status) void onboardingStore.refresh();
	});

	let status = $derived(onboardingStore.status);
	let model = $derived(onboardingStore.selected);
	let progress = $derived(onboardingStore.progress);
	let downloading = $derived(onboardingStore.downloading);

	/** decimal units, the way the cli and finder count */
	function size(bytes: number | null | undefined): string {
		if (!bytes) return '—';

		return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
	}

	function fitLabel(entry: TilekitModelEntry): string {
		if (!status?.device) return 'Runs on your CPU';

		switch (entry.fit) {
			case 'fits':
				return 'Fits your GPU';
			case 'experts_on_cpu':
				return 'Runs with its experts on the CPU';
			case 'too_big':
				return 'Too big for your GPU, runs slowly';
			default:
				return '';
		}
	}

	function stateLabel(entry: TilekitModelEntry): string {
		if (entry.state === 'ready') return 'Downloaded';

		if (entry.state === 'partial') {
			return `${size(entry.downloaded_bytes)} of ${size(entry.download_bytes)}`;
		}

		return size(entry.download_bytes);
	}

	let needed = $derived(
		model ? Math.max((model.download_bytes ?? 0) - model.downloaded_bytes, 0) : 0
	);
	let diskShort = $derived(!!status?.disk && needed > status.disk.free_bytes);
	let diskUsed = $derived(status?.disk ? 1 - status.disk.free_bytes / status.disk.total_bytes : 0);
	let diskAfter = $derived(
		status?.disk ? Math.min(needed / status.disk.total_bytes, 1 - diskUsed) : 0
	);

	let percent = $derived(
		progress && progress.total_bytes ? (progress.done_bytes / progress.total_bytes) * 100 : 0
	);
	let eta = $derived.by(() => {
		if (!progress?.bytes_per_sec) return '';

		const seconds =
			Math.max(progress.total_bytes - progress.done_bytes, 0) / progress.bytes_per_sec;
		const minutes = Math.floor(seconds / 60);

		return minutes > 0
			? `${minutes}m ${Math.round(seconds % 60)}s left`
			: `${Math.round(seconds)}s left`;
	});

	let action = $derived.by(() => {
		if (!model) return '';

		if (model.state === 'ready') return 'Start with this model';

		if (model.state === 'partial') return 'Continue download';

		return 'Download and start';
	});

	function go() {
		if (model?.state === 'ready') void onboardingStore.start();
		else void onboardingStore.download();
	}
</script>

<div class="flex min-h-dvh w-full items-center justify-center bg-background px-6 py-12 sm:px-8">
	<div class="flex w-full max-w-md flex-col">
		<header class="flex flex-col">
			<Logo class="text-signal" style="--size: 3.75rem" />

			{#if inFlow}
				<div class="mt-7">
					<OnboardingSteps current={3} />
				</div>
			{/if}

			<div class="mt-5 flex flex-col gap-3">
				<h1 class="text-3xl font-semibold tracking-tight text-bone">Your model</h1>

				<p class="max-w-[42ch] text-sm leading-6 text-slate">
					Tiles runs a model on this machine, so your chats never leave it.
					{#if status?.device}
						Sized for your {status.device.name}.
					{/if}
				</p>
			</div>
		</header>

		{#if !status}
			<div aria-busy="true" class="mt-9 flex flex-col gap-3">
				<div class="cut h-16 animate-pulse bg-steel"></div>

				<span class="text-xs text-slate">
					{onboardingStore.error ?? 'Checking what fits on this machine…'}
				</span>

				{#if onboardingStore.error}
					<Button class="cut h-10 rounded-none" onclick={() => onboardingStore.refresh()}
						>Try again</Button
					>
				{/if}
			</div>
		{:else}
			<div class="mt-9 flex flex-col gap-5">
				<Select.Root
					disabled={downloading}
					onValueChange={(value) => value && onboardingStore.select(value)}
					type="single"
					value={onboardingStore.selectedId ?? undefined}
				>
					<Select.Trigger
						class="cut h-auto min-h-16 w-full rounded-none border-border bg-steel px-4 py-3"
					>
						{#if model}
							<div class="flex w-full items-center justify-between gap-3 text-left">
								<div class="flex min-w-0 flex-col">
									<span class="text-sm font-medium text-bone">{model.label}</span>

									<span class="text-xs text-slate">{fitLabel(model)}</span>
								</div>

								<span class="shrink-0 text-xs text-slate">{stateLabel(model)}</span>
							</div>
						{/if}
					</Select.Trigger>

					<Select.Content>
						{#each status.models as entry (entry.id)}
							<Select.Item
								class="data-[highlighted]:bg-signal data-[highlighted]:text-void data-[highlighted]:**:text-void"
								label={entry.label}
								value={entry.id}
							>
								<div class="flex w-full items-center justify-between gap-4">
									<div class="flex flex-col">
										<span class="flex items-center gap-2">
											{entry.label}
											{#if entry.recommended}
												<span class="text-[10px] font-medium tracking-wide text-signal uppercase"
													>Recommended</span
												>
											{/if}
										</span>

										<span class="text-xs text-muted-foreground">{fitLabel(entry)}</span>
									</div>

									<span class="shrink-0 text-xs text-muted-foreground">{stateLabel(entry)}</span>
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				{#if downloading && progress}
					<div class="flex flex-col gap-2" role="status">
						<div class="h-2 w-full bg-steel">
							<div
								class="h-full bg-signal transition-[width] duration-300"
								style="width: {percent}%"
							></div>
						</div>

						<div class="flex justify-between text-xs text-slate tabular-nums">
							<span
								>{size(progress.done_bytes)} of {size(progress.total_bytes)} · {Math.floor(
									percent
								)}%</span
							>

							<span>
								{#if progress.bytes_per_sec}{size(progress.bytes_per_sec)}/s · {eta}{/if}
							</span>
						</div>
					</div>

					<Button
						class="cut h-11 w-full rounded-none border border-border bg-transparent text-bone hover:bg-steel"
						onclick={() => onboardingStore.cancel()}
					>
						Pause download
					</Button>
				{:else if model}
					{#if status.disk && model.state !== 'ready'}
						<div class="flex flex-col gap-2">
							<div aria-hidden="true" class="flex h-1.5 w-full bg-steel">
								<div class="h-full bg-slate/50" style="width: {diskUsed * 100}%"></div>

								<div
									class="h-full {diskShort ? 'bg-alert' : 'bg-signal'}"
									style="width: {diskAfter * 100}%"
								></div>
							</div>

							<span class="text-xs {diskShort ? 'text-alert' : 'text-slate'}">
								{#if diskShort}
									Not enough space: this needs {size(needed)}, {size(status.disk.free_bytes)} is free
								{:else}
									{size(status.disk.free_bytes)} free · this needs {size(needed)}
								{/if}
							</span>
						</div>
					{/if}

					{#if onboardingStore.confirmReplace}
						<div class="flex flex-col gap-3 border border-border p-4">
							<span class="text-sm text-bone">Your modelfile has edits of your own.</span>

							<span class="text-xs leading-5 text-slate">
								Switching to {model.label} replaces it with the one written for this model.
							</span>

							<Button
								class="cut h-10 rounded-none bg-signal text-void hover:bg-signal hover:brightness-110"
								onclick={() => onboardingStore.start(true)}
							>
								Replace and start
							</Button>
						</div>
					{:else}
						<Button
							class="cut h-11 w-full rounded-none bg-signal text-void hover:bg-signal hover:brightness-110 disabled:bg-steel disabled:text-slate disabled:opacity-100"
							disabled={diskShort || onboardingStore.selecting}
							onclick={go}
						>
							{onboardingStore.selecting ? 'Starting…' : action}
						</Button>
					{/if}
				{/if}

				{#if onboardingStore.error && status}
					<span class="text-xs text-alert">{onboardingStore.error}</span>
				{/if}
			</div>
		{/if}
	</div>
</div>
