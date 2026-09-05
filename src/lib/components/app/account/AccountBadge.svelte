<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { ICON_CLASS_XS } from '$lib/constants';
	import { accountStore } from '$lib/stores/account.svelte';

	interface Props {
		/** Collapsed rail shows the plate only. */
		expanded?: boolean;
	}

	let { expanded = true }: Props = $props();

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	let account = $derived(accountStore.account);
	let initial = $derived((account?.nickname ?? '?').charAt(0).toUpperCase());

	async function copyDid() {
		if (!account) return;

		await navigator.clipboard.writeText(account.id);
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 1500);
	}
</script>

{#if account}
	<div class="border-t border-border px-2 py-2">
		<Popover.Root>
			<Popover.Trigger
				class="flex w-full items-center gap-2 px-1.5 py-1.5 text-left hover:bg-steel"
			>
				<span
					class="cut flex h-6 w-6 shrink-0 items-center justify-center bg-steel text-[11px] font-semibold text-ash"
				>
					{initial}
				</span>

				{#if expanded}
					<span class="flex min-w-0 flex-col leading-tight">
						<span class="truncate text-[13px] text-bone">{account.nickname}</span>

						<span class="truncate font-mono text-[11px] text-slate">{accountStore.shortDid}</span>
					</span>
				{/if}
			</Popover.Trigger>

			<Popover.Content align="start" class="w-72 border-border bg-steel" side="top">
				<div class="flex flex-col gap-3">
					<div class="flex items-center gap-2">
						<span
							class="cut flex h-8 w-8 shrink-0 items-center justify-center bg-background text-[13px] font-semibold text-ash"
						>
							{initial}
						</span>

						<div class="flex min-w-0 flex-col leading-tight">
							<span class="truncate text-[13px] text-bone">{account.nickname}</span>

							<span class="text-[11px] text-slate">Local account</span>
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-[11px] font-medium text-slate">DID</span>

						<button
							class="cut flex items-start gap-2 bg-background p-2 text-left hover:text-bone"
							onclick={copyDid}
							type="button"
						>
							<span class="min-w-0 flex-1 font-mono text-[11px] break-all text-ash">
								{account.id}
							</span>

							{#if copied}
								<Check class="{ICON_CLASS_XS} shrink-0 text-signal" />
							{:else}
								<Copy class="{ICON_CLASS_XS} shrink-0 text-slate" />
							{/if}
						</button>
					</div>

					<p class="text-[11px] leading-relaxed text-slate">
						Your keypair lives in this machine's keychain. Nothing about this account leaves the
						device.
					</p>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>
{/if}
