<script lang="ts">
	import { Logo } from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import { onboardingStore } from '$lib/stores';
	import { accountStore } from '$lib/stores/account.svelte';
	import OnboardingSteps from './OnboardingSteps.svelte';

	let handle = $state('');

	let connecting = $derived(accountStore.atprotoState === 'connecting');
	let canConnect = $derived(handle.trim().length > 0 && !connecting);

	// the login finishes in the browser, so moving on is the store's news
	$effect(() => {
		if (accountStore.atprotoState === 'ready') onboardingStore.finishAtmosphere();
	});

	async function connect(event: SubmitEvent) {
		event.preventDefault();
		if (canConnect) await accountStore.connectAtproto(handle);
	}

	function skip() {
		if (connecting) accountStore.cancelConnect();
		onboardingStore.finishAtmosphere();
	}
</script>

<div class="flex min-h-dvh w-full items-center justify-center bg-background px-6 py-12 sm:px-8">
	<form class="flex w-full max-w-md flex-col" onsubmit={connect}>
		<header class="flex flex-col">
			<Logo class="text-signal" style="--size: 3.75rem" />

			<div class="mt-7">
				<OnboardingSteps current={2} />
			</div>

			<div class="mt-5 flex flex-col gap-3">
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-semibold tracking-tight text-bone">Connect Atmosphere</h1>

					<span
						class="border border-border px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate uppercase"
					>
						Optional
					</span>
				</div>

				<p class="max-w-[42ch] text-sm leading-6 text-slate">
					An Atmosphere Account lets you share chats and use Tiles' social features. Tiles works
					fully without one, and you can connect later from your account.
				</p>
			</div>
		</header>

		<div class="mt-9 flex flex-col gap-5">
			<div class="flex flex-col gap-2.5">
				<label class="text-xs font-medium text-slate" for="handle">Handle</label>

				<input
					bind:value={handle}
					autocomplete="off"
					class="cut h-12 w-full border border-border bg-steel px-4 text-sm text-bone outline-none transition-colors placeholder:text-slate focus:border-signal/60"
					disabled={connecting}
					id="handle"
					placeholder="you.bsky.social"
					spellcheck="false"
				/>

				{#if connecting}
					<span class="text-xs text-slate">Waiting for your browser…</span>
				{:else if accountStore.atprotoError}
					<span class="text-xs text-alert">{accountStore.atprotoError}</span>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3">
				<Button
					class="cut h-11 w-full rounded-none border border-border bg-transparent text-bone hover:bg-steel"
					onclick={skip}
					type="button"
				>
					{connecting ? 'Cancel and skip' : 'Skip for now'}
				</Button>

				<Button
					class="cut h-11 w-full rounded-none bg-signal text-void hover:bg-signal hover:brightness-110 disabled:bg-steel disabled:text-slate disabled:opacity-100"
					disabled={!canConnect}
					type="submit"
				>
					{connecting ? 'Connecting…' : 'Connect'}
				</Button>
			</div>
		</div>
	</form>
</div>
