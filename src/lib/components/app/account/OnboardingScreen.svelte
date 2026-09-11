<script lang="ts">
	import { Logo } from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import { accountStore } from '$lib/stores/account.svelte';

	let nickname = $state('');
	let touched = $state(false);

	let canSubmit = $derived(nickname.trim().length > 0 && !accountStore.creating);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		touched = true;

		if (!canSubmit) return;

		await accountStore.create(nickname);
	}
</script>

<div class="flex min-h-dvh w-full items-center justify-center bg-background px-6 py-12 sm:px-8">
	<form class="flex w-full max-w-md flex-col" onsubmit={submit}>
		<header class="flex flex-col">
			<Logo class="text-signal" style="--size: 3.75rem" />

			<div class="mt-7 flex flex-col gap-3">
				<h1 class="text-3xl font-semibold tracking-tight text-bone">Welcome to Tiles</h1>

				<p class="max-w-[42ch] text-sm leading-6 text-slate">
					Create a local Tiles Account for peer-to-peer sync, remote inference, and other
					local-first features. Generated and secured on this device, it uses DIDs and UCANs for
					zero-trust authentication and authorization.
				</p>
			</div>
		</header>

		<div class="mt-9 flex flex-col gap-5">
			<div class="flex flex-col gap-2.5">
				<label class="text-xs font-medium text-slate" for="nickname">Username</label>

				<input
					bind:value={nickname}
					autocomplete="off"
					class="cut h-12 w-full border border-border bg-steel px-4 text-sm text-bone outline-none transition-colors placeholder:text-slate focus:border-signal/60"
					disabled={accountStore.creating}
					id="nickname"
					placeholder="your name"
					spellcheck="false"
				/>

				{#if touched && nickname.trim().length === 0}
					<span class="text-xs text-alert">A username is required.</span>
				{/if}

				{#if accountStore.error}
					<span class="text-xs text-alert">{accountStore.error}</span>
				{/if}
			</div>

			<Button
				class="cut h-11 w-full rounded-none bg-signal text-void hover:bg-signal hover:brightness-110 disabled:bg-steel disabled:text-slate disabled:opacity-100"
				disabled={!canSubmit}
				type="submit"
			>
				{accountStore.creating ? 'Creating…' : 'Create Tiles Account'}
			</Button>
		</div>

		<p class="mt-8 border-t border-border pt-5 text-xs leading-5 text-slate">
			You can connect an optional Atmosphere Account later for online social features. Tiles works
			without one.
		</p>
	</form>
</div>
