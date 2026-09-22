<script lang="ts">
	import { X } from '@lucide/svelte';
	import { pluginsStore } from '$lib/stores';

	let text = $derived(pluginsStore.error ?? pluginsStore.notice);
</script>

{#if text}
	<div
		class="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[min(40rem,calc(100%-2rem))] items-center gap-3 rounded-lg bg-secondary px-4 py-3 text-sm shadow-lg ring-1 ring-border/60"
		role="status"
	>
		<p class="min-w-0 flex-1 leading-5 {pluginsStore.error ? 'text-destructive' : ''}">{text}</p>

		<button
			aria-label="Dismiss"
			class="text-muted-foreground transition-colors hover:text-foreground"
			onclick={() => pluginsStore.dismissNotice()}
			type="button"
		>
			<X class="h-4 w-4" />
		</button>
	</div>
{/if}
