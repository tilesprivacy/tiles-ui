<script lang="ts">
	import Logo from './Logo.svelte';
	import ModelPicker from './ModelPicker.svelte';
	import Progress from './Progress.svelte';
	import { size } from '#lib/format.ts';
	import { describe, isListed, models, running } from '#lib/state/models.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';

	let step = $state(1);
	let busy = $state(false);
	let error = $state('');
	let nickname = $state('');
	let handle = $state('');
	let signIn: AbortController | null = $state(null);
	let picked = $state<string | null>(null);
	let started = $state(false);

	const chosen = $derived(models.list.find((m) => m.model === picked));
	const listed = $derived(chosen && isListed(chosen) ? chosen : undefined);
	const info = $derived(chosen ? describe(chosen) : undefined);
	const free = $derived(models.list.find(isListed)?.free_disk);

	$effect(() => {
		if (step !== 3) return;
		models.load().then(() => {
			const start = models.list.find((m) => m.current) ?? models.list.find((m) => m.default);
			picked ??= start?.model ?? null;
		});
		models.watch();
	});

	async function attempt(work: () => Promise<unknown>) {
		busy = true;
		error = '';
		try {
			await work();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			busy = false;
		}
	}

	const createAccount = () =>
		attempt(async () => {
			await tiles.createAccount(nickname.trim());
			await tiles.loadAtproto();
			step = tiles.atproto ? 3 : 2;
		});

	async function connect() {
		const tab = window.open('', '_blank');
		signIn = new AbortController();
		await attempt(async () => {
			await tiles.signIn(handle, tab, signIn!.signal);
			if (tiles.atproto) step = 3;
		});
		if (!tiles.atproto) tab?.close();
		signIn = null;
	}

	const download = () => attempt(() => models.downloadToUse(picked!).then(() => (started = true)));
	const use = () => attempt(() => models.use(picked!).then(finish));
	const pause = () => attempt(() => models.pause(picked!));

	// finish booting, this starts the model server
	const finish = () => tiles.boot();

	// a model downloaded here moves setup on once it's done
	$effect(() => {
		if (started && info?.ready) finish();
	});
</script>

<main>
	<form class="step" onsubmit={(e) => e.preventDefault()}>
		<Logo size={34} />
		<div class="steps" aria-label="Step {step} of 3">
			{#each [1, 2, 3] as n (n)}<i class:on={n <= step}></i>{/each}
			<span>Step {step} of 3</span>
		</div>

		{#if step === 1}
			<h1>Welcome to Tiles</h1>
			<p class="muted">Pick a nickname. It stays on this device.</p>
			<!-- svelte-ignore a11y_autofocus -->
			<input class="field" bind:value={nickname} placeholder="Nickname" maxlength="64" autofocus />
			{#if error}<p class="error">{error}</p>{/if}
			<button class="plate signal" disabled={busy || !nickname.trim()} onclick={createAccount}>
				Create Tiles Account
			</button>
		{:else if step === 2}
			<h1>Connect Atmosphere Account</h1>
			<p class="muted">
				Sign in with your Bluesky handle to share chats later. You can do this any time.
			</p>
			<input
				class="field mono"
				bind:value={handle}
				placeholder="alice.bsky.social"
				autocapitalize="off"
				spellcheck="false"
				disabled={!!signIn}
			/>
			{#if error}<p class="error">{error}</p>{/if}
			{#if signIn}
				<div class="wait">
					<span class="spin"></span>
					<span>Waiting for your browser…</span>
					<button class="link" onclick={() => signIn?.abort()}>Cancel</button>
				</div>
			{:else}
				<div class="row">
					<button class="plate ghost" onclick={() => ((step = 3), (error = ''))}
						>Skip for now</button
					>
					<button class="plate signal" disabled={!handle.trim()} onclick={connect}>Connect</button>
				</div>
			{/if}
		{:else}
			<h1>Download your model</h1>
			<p class="muted">Tiles runs this model on your computer. Nothing you type leaves it.</p>
			{#if models.reason}
				<p class="error">{models.reason}</p>
				<button class="plate" onclick={() => models.load()}>Try again</button>
			{:else if listed && running(listed.download)}
				<div class="model">
					<b>{listed.label}</b>
					<Progress download={listed.download} />
				</div>
				<div class="row">
					<button class="plate ghost" disabled={busy} onclick={pause}>Pause</button>
					<button class="plate" onclick={finish}>Explore Tiles meanwhile</button>
				</div>
			{:else}
				<ModelPicker options={models.list} bind:value={picked} />
				{#if free != null}<p class="muted small">{size(free)} free on this computer</p>{/if}
				{#if error}<p class="error">{error}</p>{/if}
				{#if info?.ready}
					<button class="plate signal" disabled={busy} onclick={use}>Start</button>
				{:else}
					<button
						class="plate signal"
						disabled={busy || !listed || info?.blocked}
						onclick={download}
					>
						{listed?.download.state === 'paused' ? 'Continue download' : 'Download and start'}
					</button>
				{/if}
				<button class="link" onclick={finish}>Skip for now</button>
			{/if}
		{/if}
	</form>
</main>

<style>
	main {
		height: 100%;
		display: grid;
		place-items: center;
		padding: 24px;
		overflow-y: auto;
	}

	.step {
		width: min(400px, 100%);
		display: grid;
		gap: 18px;
	}

	.steps {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: var(--fs-body);
		color: var(--slate);
	}

	.steps i {
		width: 28px;
		height: 3px;
		background: var(--rule);
	}

	.steps i.on {
		background: var(--signal);
	}

	.steps span {
		margin-left: 8px;
	}

	h1 {
		font-size: 24px;
		font-weight: 600;
		letter-spacing: var(--tracking-display);
	}

	h1 + p {
		margin-top: -10px;
	}

	.plate {
		padding: 11px 14px;
	}

	.row {
		display: flex;
		gap: 10px;
	}

	.row > * {
		flex: 1;
	}

	.wait {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border: var(--hairline) solid var(--rule);
		border-radius: var(--radius);
		color: var(--ash);
	}

	.wait .link {
		margin-left: auto;
	}

	.link {
		justify-self: center;
		color: var(--slate);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.model {
		display: grid;
		gap: 12px;
		padding: 14px;
		border: var(--hairline) solid var(--rule);
		border-radius: var(--radius);
	}

	.small {
		font-size: var(--fs-body);
		margin-top: -8px;
	}
</style>
