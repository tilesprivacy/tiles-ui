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

<div class="flex h-dvh w-full items-center justify-center bg-background px-6">
	<form class="flex w-full max-w-sm flex-col gap-6" onsubmit={submit}>
		<div class="flex flex-col gap-3">
			<Logo class="text-signal" style="--size: 2rem" />

			<h1 class="text-2xl font-semibold tracking-tight text-bone">Welcome to Tiles</h1>

			<p class="text-[13px] leading-relaxed text-slate">
				Tiles runs on your machine. Pick a username and we'll generate a keypair for you — it stays
				in this device's keychain and identifies you to peers you choose to link with.
			</p>
		</div>

		<div class="flex flex-col gap-2">
			<label class="text-[11px] font-medium text-slate" for="nickname">Username</label>

			<input
				bind:value={nickname}
				autocomplete="off"
				class="cut w-full border border-border bg-steel px-3 py-2 text-[13px] text-bone outline-none placeholder:text-slate focus:border-signal/60"
				disabled={accountStore.creating}
				id="nickname"
				placeholder="yourname"
				spellcheck="false"
			/>

			{#if touched && nickname.trim().length === 0}
				<span class="text-[11px] text-alert">A username is required.</span>
			{/if}

			{#if accountStore.error}
				<span class="text-[11px] text-alert">{accountStore.error}</span>
			{/if}
		</div>

		<Button
			class="cut w-full rounded-none bg-signal text-void hover:bg-signal hover:brightness-110 disabled:bg-steel disabled:text-slate disabled:opacity-100"
			disabled={!canSubmit}
			type="submit"
		>
			{accountStore.creating ? 'Creating…' : 'Create account'}
		</Button>

		<p class="text-[11px] leading-relaxed text-slate">
			An AT Protocol account can be connected later. It is optional — Tiles works entirely offline
			without one.
		</p>
	</form>
</div>
