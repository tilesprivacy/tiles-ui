<script lang="ts">
	import { LoaderCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { pluginsStore } from '$lib/stores';

	interface Props {
		name: string;
		/** where a not-yet-installed plugin installs from; omit to offer no install */
		source?: string;
	}

	let { name, source }: Props = $props();

	let installed = $derived(pluginsStore.byName(name));
	let busy = $derived(pluginsStore.isBusy(name));
	let confirming = $state(false);

	async function uninstall() {
		if (!confirming) {
			confirming = true;

			return;
		}

		confirming = false;
		await pluginsStore.uninstall(name);
	}
</script>

{#if installed}
	<div class="flex shrink-0 items-center gap-3">
		{#if installed.bundled}
			<span class="text-xs text-muted-foreground">Built-in</span>
		{:else}
			<Button
				disabled={busy}
				onblur={() => (confirming = false)}
				onclick={uninstall}
				size="sm"
				variant={confirming ? 'destructive' : 'ghost'}
			>
				{confirming ? 'Confirm' : 'Uninstall'}
			</Button>
		{/if}

		<Switch
			aria-label={installed.enabled ? `Disable ${name}` : `Enable ${name}`}
			checked={installed.enabled}
			disabled={busy}
			onCheckedChange={(checked) => pluginsStore.setEnabled(name, checked)}
		/>
	</div>
{:else if source}
	<Button disabled={pluginsStore.installing} onclick={() => pluginsStore.install(source)} size="sm">
		{#if pluginsStore.installing}
			<LoaderCircle class="animate-spin" />
			Installing
		{:else}
			Install
		{/if}
	</Button>
{/if}
