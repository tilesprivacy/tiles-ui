<script lang="ts">
	import ProgressRing from '../../../models/ProgressRing.svelte';
	import { ModelId } from '$lib/components/app';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { MODEL_SELECTOR_ICON, ROUTES } from '$lib/constants';
	import { agentStore, modelLibraryStore } from '$lib/stores';
	import { onMount } from 'svelte';

	onMount(() => {
		void agentStore.refresh();
	});

	let library = $derived(modelLibraryStore);
	/** no model to chat with yet: say why, and where to fix it */
	let missing = $derived(library.status !== null && !library.hasModel);

	// "ready" stays up a moment, then the chip takes over again
	$effect(() => {
		if (!library.justReady) return;

		const timer = setTimeout(() => (modelLibraryStore.justReady = null), 6000);

		return () => clearTimeout(timer);
	});
</script>

<svelte:window onfocus={() => void agentStore.refresh()} />

{#if library.justReady}
	<a
		class="inline-flex items-center gap-1.5 rounded-sm bg-background px-2 py-1 text-xs text-signal shadow-sm dark:bg-muted-foreground/15"
		href={ROUTES.MODELS}
	>
		{library.justReady} is ready
	</a>
{:else if missing}
	<a
		class="inline-flex max-w-[min(calc(100cqw-9rem),25rem)] items-center gap-1.5 rounded-sm bg-background px-2 py-1 text-xs text-foreground shadow-sm transition-colors hover:bg-muted-foreground/20 dark:bg-muted-foreground/15 dark:text-secondary-foreground"
		href={ROUTES.MODELS}
	>
		{#if library.downloading}
			<ProgressRing percent={library.percent} size={14} />

			<span class="truncate">
				{library.downloadingModel?.label ?? 'Your model'} is downloading · {Math.floor(
					library.percent
				)}%
			</span>
		{:else}
			<MODEL_SELECTOR_ICON class="h-3.5 w-3.5 shrink-0" />

			<span class="truncate">No model yet · Set one up</span>
		{/if}
	</a>
{:else if agentStore.model}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<span
					{...props}
					class="inline-flex max-w-[min(calc(100cqw-9rem),25rem)] items-center gap-1 rounded-sm bg-background px-1.5 py-1 text-xs text-foreground shadow-sm dark:bg-muted-foreground/15 dark:text-secondary-foreground"
				>
					<MODEL_SELECTOR_ICON class="h-3.5 w-3.5 shrink-0" />

					<ModelId class="min-w-0 overflow-hidden" hideOrgName modelId={agentStore.model ?? ''} />
				</span>
			{/snippet}
		</Tooltip.Trigger>

		<Tooltip.Content>
			<p class="font-mono">{agentStore.model}</p>
		</Tooltip.Content>
	</Tooltip.Root>
{/if}
