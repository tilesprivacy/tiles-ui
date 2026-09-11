<script lang="ts">
	import { Check, Copy, ExternalLink, Loader2, LogOut } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { ICON_CLASS_XS } from '$lib/constants';
	import { accountStore } from '$lib/stores/account.svelte';

	interface Props {
		/** Collapsed rail shows the plate only. */
		expanded?: boolean;
	}

	let { expanded = true }: Props = $props();

	let copied = $state<string | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let disconnecting = $state(false);
	let handleInput = $state('');
	let failedAvatar = $state<string | null>(null);

	let account = $derived(accountStore.account);
	let atproto = $derived(accountStore.atproto);
	let avatar = $derived(
		atproto?.avatar && failedAvatar !== atproto.avatar ? atproto.avatar : undefined
	);
	let connecting = $derived(accountStore.atprotoState === 'connecting');
	let initial = $derived((account?.nickname ?? '?').charAt(0).toUpperCase());

	async function copyDid(did: string) {
		await navigator.clipboard.writeText(did);
		copied = did;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = null), 1500);
	}

	async function connect(event: SubmitEvent) {
		event.preventDefault();

		if (await accountStore.connectAtproto(handleInput)) handleInput = '';
	}

	async function disconnect() {
		if (disconnecting) return;

		disconnecting = true;

		try {
			await accountStore.disconnectAtproto();
		} finally {
			disconnecting = false;
		}
	}
</script>

{#if account}
	<div class="border-t border-border px-2 py-2">
		<Popover.Root>
			<Popover.Trigger
				class="flex w-full items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-steel {expanded
					? 'px-2'
					: 'justify-center px-0'}"
			>
				<span
					class="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-steel text-[12px] font-semibold text-ash"
				>
					{#if avatar}
						<img
							alt=""
							class="h-full w-full object-cover"
							onerror={() => (failedAvatar = avatar)}
							referrerpolicy="no-referrer"
							src={avatar}
						/>
					{:else}
						{initial}
					{/if}

					{#if atproto}
						<!-- a connected identity is worth showing without opening the panel -->
						<span
							class="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-signal ring-2 ring-background"
						></span>
					{/if}
				</span>

				{#if expanded}
					<span class="flex min-w-0 flex-col leading-tight">
						<span class="truncate text-[13px] text-bone">{account.nickname}</span>

						<span class="truncate font-mono text-[11px] text-slate">
							{atproto ? `@${atproto.handle}` : accountStore.shortDid}
						</span>
					</span>
				{/if}
			</Popover.Trigger>

			<Popover.Content align="start" class="w-[17rem] border-border bg-steel p-4" side="top">
				<div class="flex flex-col gap-5">
					<!-- Tiles account -->
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<span
								class="cut flex h-8 w-8 shrink-0 items-center justify-center bg-background text-[13px] font-semibold text-ash"
							>
								{initial}
							</span>

							<div class="flex min-w-0 flex-col leading-tight">
								<span class="truncate text-[13px] text-bone">{account.nickname}</span>

								<span class="text-[11px] text-slate">Tiles Account</span>
							</div>
						</div>

						<button
							aria-label="Copy Tiles account DID"
							class="cut flex items-start gap-2 bg-background p-2 text-left hover:text-bone"
							onclick={() => copyDid(account.id)}
							type="button"
						>
							<span class="min-w-0 flex-1 font-mono text-[11px] break-all text-ash">
								{account.id}
							</span>

							{#if copied === account.id}
								<Check class="{ICON_CLASS_XS} shrink-0 text-signal" />
							{:else}
								<Copy class="{ICON_CLASS_XS} shrink-0 text-slate" />
							{/if}
						</button>

						<p class="text-[11px] leading-relaxed text-slate">
							Your Tiles Account is generated and secured on this device. It is ready for
							peer-to-peer sync, remote inference, and other local-first features, using DIDs and
							UCANs for zero-trust authentication and authorization.
						</p>
					</div>

					<div class="border-t border-border"></div>

					<!-- Atmosphere account -->
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<span
								class="cut flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden bg-background text-[13px] font-semibold text-ash"
							>
								{#if avatar}
									<img
										alt=""
										class="h-full w-full object-cover"
										onerror={() => (failedAvatar = avatar)}
										referrerpolicy="no-referrer"
										src={avatar}
									/>
								{:else}
									{atproto ? atproto.handle.charAt(0).toUpperCase() : '@'}
								{/if}
							</span>

							<div class="flex min-w-0 flex-col leading-tight">
								<span class="truncate text-[13px] text-bone">
									{atproto ? `@${atproto.handle}` : 'Not connected'}
								</span>

								<span class="text-[11px] text-slate">Atmosphere Account</span>
							</div>
						</div>

						{#if atproto}
							<button
								aria-label="Copy Atmosphere account DID"
								class="cut flex items-start gap-2 bg-background p-2 text-left hover:text-bone"
								onclick={() => copyDid(atproto.did)}
								type="button"
							>
								<span class="min-w-0 flex-1 font-mono text-[11px] break-all text-ash">
									{atproto.did}
								</span>

								{#if copied === atproto.did}
									<Check class="{ICON_CLASS_XS} shrink-0 text-signal" />
								{:else}
									<Copy class="{ICON_CLASS_XS} shrink-0 text-slate" />
								{/if}
							</button>

							<p class="text-[11px] leading-relaxed text-slate">
								Your Atmosphere Account is connected and ready to share conversations through your
								AT Protocol PDS.
							</p>

							<Button
								class="cut h-9 self-start justify-start rounded-none border border-border bg-background px-2.5 text-[11px] text-ash hover:border-alert/40 hover:bg-alert/10 hover:text-alert"
								disabled={disconnecting}
								onclick={disconnect}
								type="button"
								variant="ghost"
							>
								{#if disconnecting}
									<Loader2 class="{ICON_CLASS_XS} animate-spin" />
									Signing out…
								{:else}
									<LogOut class={ICON_CLASS_XS} />
									Sign out
								{/if}
							</Button>
						{:else if connecting}
							<div class="cut flex flex-col gap-2 bg-background p-2">
								<span class="flex items-center gap-2 text-[11px] text-bone">
									<Loader2 class="{ICON_CLASS_XS} animate-spin text-signal" />
									Waiting for your browser
								</span>

								<p class="text-[11px] leading-relaxed text-slate">
									Finish signing in on the page that just opened. This panel can be closed — it will
									keep going.
								</p>

								<button
									class="self-start text-[11px] text-slate underline underline-offset-2 hover:text-bone"
									onclick={() => accountStore.cancelConnect()}
									type="button"
								>
									Cancel
								</button>
							</div>
						{:else}
							<form class="flex flex-col gap-2" onsubmit={connect}>
								<div class="flex gap-1.5">
									<input
										bind:value={handleInput}
										autocapitalize="off"
										autocomplete="off"
										class="cut min-w-0 flex-1 border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-ash outline-none placeholder:text-slate focus:border-signal/60"
										placeholder="you.bsky.social"
										spellcheck="false"
									/>

									<Button
										class="cut h-auto shrink-0 rounded-none bg-signal px-2.5 text-[11px] text-void hover:bg-signal hover:brightness-110 disabled:bg-steel disabled:text-slate disabled:opacity-100"
										disabled={handleInput.trim().length === 0}
										type="submit"
									>
										Connect
									</Button>
								</div>

								<p class="flex items-start gap-1 text-[11px] leading-relaxed text-slate">
									<ExternalLink class="{ICON_CLASS_XS} mt-0.5 shrink-0" />

									<span>
										You can connect an optional Atmosphere Account later for online social features.
										Tiles works without one.
									</span>
								</p>
							</form>
						{/if}

						{#if accountStore.atprotoError}
							<span class="text-[11px] text-alert">{accountStore.atprotoError}</span>
						{/if}
					</div>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>
{/if}
