<script lang="ts">
	import { ArrowUp } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface Props {
		canSend?: boolean;
		disabled?: boolean;
		showErrorState?: boolean;
		tooltipLabel?: string;
	}

	let { canSend = false, disabled = false, showErrorState = false, tooltipLabel }: Props = $props();

	let isDisabled = $derived(!canSend || disabled);
</script>

{#snippet submitButton(props = {})}
	<Button
		class={[
			'md:h-8 md:w-8 h-9 w-9 rounded-none cut p-0',
			'bg-signal text-void hover:bg-signal hover:brightness-110',
			'disabled:bg-steel disabled:text-slate disabled:opacity-100',
			showErrorState && 'bg-alert! text-void! hover:brightness-110'
		]}
		disabled={isDisabled}
		type="submit"
		{...props}
	>
		<span class="sr-only">Send</span>

		<ArrowUp class="h-12 w-12" />
	</Button>
{/snippet}

{#if tooltipLabel}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{@render submitButton()}
		</Tooltip.Trigger>

		<Tooltip.Content>
			<p>{tooltipLabel}</p>
		</Tooltip.Content>
	</Tooltip.Root>
{:else}
	{@render submitButton()}
{/if}
