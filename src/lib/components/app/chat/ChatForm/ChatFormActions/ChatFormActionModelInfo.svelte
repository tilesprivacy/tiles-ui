<script lang="ts">
	import { ModelId } from '$lib/components/app';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { MODEL_SELECTOR_ICON } from '$lib/constants';
	import { agentStore } from '$lib/stores';
	import { onMount } from 'svelte';

	onMount(() => {
		void agentStore.refresh();
	});
</script>

<svelte:window onfocus={() => void agentStore.refresh()} />

{#if agentStore.model}
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
