<script lang="ts">
	import { Check, Globe, Lock, Share2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { TilekitService } from '$lib/services/tilekit.service';
	import { accountStore } from '$lib/stores/account.svelte';
	import { copyToClipboard } from '$lib/utils';

	interface Props {
		sessionId: string;
	}

	let { sessionId }: Props = $props();

	// the daemon writes the snapshot to the user's own PDS, so there is nowhere
	// to put it until they have one
	let canShare = $derived(accountStore.atprotoState === 'ready');

	let busy = $state(false);
	let copied = $state(false);
	let error = $state<string | null>(null);

	async function share(isPrivate: boolean) {
		if (busy) return;

		busy = true;
		error = null;
		copied = false;

		try {
			const shared = await TilekitService.shareSession(sessionId, isPrivate);

			// the link is the whole point, and a private one cannot be recovered
			// afterwards because the key only exists in this fragment
			copied = await copyToClipboard(shared.url);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

{#if canShare}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger disabled={busy}>
			{#snippet child({ props })}
				<Button {...props} class="gap-1.5" size="sm" variant="ghost">
					{#if copied}
						<Check class="h-4 w-4" />
						Link copied
					{:else}
						<Share2 class="h-4 w-4" />
						{busy ? 'Sharing…' : 'Share'}
					{/if}
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>

		<DropdownMenu.Content align="end" class="z-[999999] w-64">
			<DropdownMenu.Item onclick={() => share(true)}>
				<Lock class="h-4 w-4" />

				<div class="flex flex-col">
					<span>Share privately</span>

					<span class="text-xs text-muted-foreground">
						Encrypted, only someone with the link can read it
					</span>
				</div>
			</DropdownMenu.Item>

			<DropdownMenu.Item onclick={() => share(false)}>
				<Globe class="h-4 w-4" />

				<div class="flex flex-col">
					<span>Share publicly</span>

					<span class="text-xs text-muted-foreground">Readable by anyone on the network</span>
				</div>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{:else}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<span {...props} class="inline-block">
					<Button class="gap-1.5" disabled size="sm" variant="ghost">
						<Share2 class="h-4 w-4" />
						Share
					</Button>
				</span>
			{/snippet}
		</Tooltip.Trigger>

		<Tooltip.Content class="z-[9999]">
			<p>Log in to ATmosphere to share chats</p>
		</Tooltip.Content>
	</Tooltip.Root>
{/if}

{#if error}
	<p class="text-destructive absolute right-0 top-10 max-w-xs text-right text-xs">{error}</p>
{/if}
