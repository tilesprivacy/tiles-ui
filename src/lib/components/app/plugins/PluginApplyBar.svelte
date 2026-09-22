<script lang="ts">
	import { LoaderCircle, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { pluginsStore } from '$lib/stores';

	let visible = $derived(
		pluginsStore.applyPending || pluginsStore.error !== null || pluginsStore.notice !== null
	);
</script>

{#if visible}
	<div
		class="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[min(40rem,calc(100%-2rem))] items-center gap-3 rounded-lg bg-secondary px-4 py-3 text-sm shadow-lg ring-1 ring-border/60"
		role="status"
	>
		<p class="min-w-0 flex-1 leading-5">
			{#if pluginsStore.error}
				<span class="text-destructive">{pluginsStore.error}</span>
			{:else if pluginsStore.applyPending}
				Plugin changes take effect when the agent restarts. This ends the current chat.
			{:else}
				{pluginsStore.notice}
			{/if}
		</p>

		{#if pluginsStore.applyPending}
			<Button disabled={pluginsStore.applying} onclick={() => pluginsStore.apply()} size="sm">
				{#if pluginsStore.applying}
					<LoaderCircle class="animate-spin" />
					Restarting
				{:else}
					Restart agent
				{/if}
			</Button>
		{/if}

		{#if !pluginsStore.applyPending || pluginsStore.error}
			<button
				aria-label="Dismiss"
				class="text-muted-foreground transition-colors hover:text-foreground"
				onclick={() => pluginsStore.dismissNotice()}
				type="button"
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>
{/if}
