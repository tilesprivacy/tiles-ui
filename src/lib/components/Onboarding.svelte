<script lang="ts">
	import GpuCard from './GpuCard.svelte';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';
	import ModelPicker from './ModelPicker.svelte';
	import Progress from './Progress.svelte';
	import { percent, size } from '#lib/format.ts';
	import { about, engine, installing } from '#lib/state/engine.svelte.ts';
	import { describe, isListed, models, running } from '#lib/state/models.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import type { EngineName } from '#lib/types.ts';

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
	const gpuSetup = $derived(engine.status);
	// the engine auto picks, as the daemon describes it
	const best = $derived(gpuSetup?.engines.find((e) => e.engine === gpuSetup.engine));
	// engines to download instead, the CPU has its own button
	const others = $derived(
		gpuSetup?.engines.filter((e) => !e.unavailable && e.download > 0 && e !== best) ?? []
	);
	let pickedEngine = $state<EngineName | null>(null);
	const chosenEngine = $derived(others.find((e) => e.engine === pickedEngine) ?? best);
	const engineInstall = $derived(gpuSetup?.download);

	// the GPU step. a llama-server set by hand needs no engine
	$effect(() => {
		if (step !== 3) return;
		engine.load().then(() => {
			// nothing to set up: a llama-server set by hand, or a Mac's Metal
			if (engine.status?.override || engine.apple) step = 4;
		});
	});

	$effect(() => {
		if (step !== 4) return;
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

	// the engine downloads in the background while a model is picked
	const downloadEngine = () =>
		attempt(async () => {
			if (chosenEngine && chosenEngine !== best) await engine.select(chosenEngine.engine);
			await engine.download();
			step = 4;
		});
	const useCpu = () => attempt(() => engine.select('cpu').then(() => (step = 4)));

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
		<div class="steps" aria-label="Step {step} of 4">
			{#each [1, 2, 3, 4] as n (n)}<i class:on={n <= step}></i>{/each}
			<span>Step {step} of 4</span>
		</div>

		{#if step === 1}
			<h1>Welcome to Tiles</h1>
			<p class="muted">Pick a nickname. It stays on this device.</p>
			<!-- svelte-ignore a11y_autofocus -->
			<input class="field" bind:value={nickname} placeholder="Nickname" maxlength="64" autofocus />
			{#if error}<p class="error">{error}</p>{/if}
			<button class="plate primary" disabled={busy || !nickname.trim()} onclick={createAccount}>
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
				<div class="wait tile">
					<span class="spin"></span>
					<span>Waiting for your browser…</span>
					<button class="link" onclick={() => signIn?.abort()}>Cancel</button>
				</div>
			{:else}
				<div class="row">
					<button class="plate ghost" onclick={() => ((step = 3), (error = ''))}
						>Skip for now</button
					>
					<button class="plate primary" disabled={!handle.trim()} onclick={connect}>Connect</button>
				</div>
			{/if}
		{:else if step === 3}
			<h1>Set up your GPU</h1>
			<p class="muted">
				Tiles runs models on your GPU when it can. That takes an engine, a one-time download.
			</p>
			{#if engine.reason && !gpuSetup}
				<p class="error">{engine.reason}</p>
				<button class="plate" onclick={() => engine.load()}>Try again</button>
			{:else if !gpuSetup || !engineInstall}
				<span class="spin"></span>
			{:else}
				<GpuCard gpu={engine.gpu} driver={gpuSetup.nvidia_driver} />
				{#if error}<p class="error">{error}</p>{/if}
				{#if installing(engineInstall)}
					<p class="muted small">{engine.label(gpuSetup.engine)} is downloading.</p>
					<button class="plate primary" onclick={() => (step = 4)}>Continue</button>
				{:else if !gpuSetup.needs_download || !best}
					<p class="muted small">
						{gpuSetup.engine === 'cpu'
							? 'Models run on the CPU. You can pick an engine any time in Settings.'
							: `${engine.label(gpuSetup.engine)} is ready.`}
					</p>
					<button class="plate primary" onclick={() => (step = 4)}>Continue</button>
				{:else}
					<div class="engines" role="radiogroup" aria-label="Engine">
						<button
							type="button"
							class="option tile row-tile"
							role="radio"
							aria-checked={chosenEngine === best}
							onclick={() => (pickedEngine = null)}
						>
							<i></i>
							<span>
								<b>{best.label}</b><span class="chip best">Recommended</span>
								<small class="muted">{about[best.engine]}</small>
							</span>
							<span class="muted">{size(best.download)}</span>
						</button>
						{#if others.length}
							<details class="others">
								<summary>Other engines <Icon name="chevron" size={12} /></summary>
								{#each others as other (other.engine)}
									<button
										type="button"
										class="option tile row-tile"
										role="radio"
										aria-checked={chosenEngine === other}
										onclick={() => (pickedEngine = other.engine)}
									>
										<i></i>
										<span>
											<b>{other.label}</b>
											<small class="muted">{about[other.engine]}</small>
										</span>
										<span class="muted">{size(other.download)}</span>
									</button>
								{/each}
							</details>
						{/if}
					</div>
					<div class="row">
						<button class="plate ghost" disabled={busy} onclick={useCpu}>Use the CPU</button>
						<button class="plate primary" disabled={busy || !chosenEngine} onclick={downloadEngine}>
							Download {chosenEngine?.label}
						</button>
					</div>
				{/if}
			{/if}
		{:else}
			<h1>Download your model</h1>
			<p class="muted">Tiles runs this model on your computer. Nothing you type leaves it.</p>
			{#if models.reason}
				<p class="error">{models.reason}</p>
				<button class="plate" onclick={() => models.load()}>Try again</button>
			{:else if listed && running(listed.download)}
				<div class="model tile">
					<b>{listed.label}</b>
					<Progress download={listed.download} />
				</div>
				<div class="row">
					<button class="plate ghost" disabled={busy} onclick={pause}>Pause</button>
					<button class="plate" onclick={finish}>Explore Tiles meanwhile</button>
				</div>
			{:else}
				<ModelPicker
					options={models.list}
					bind:value={picked}
					vram={gpuSetup?.engine === 'cpu' ? null : engine.usableVram}
				/>
				{#if free != null}<p class="muted small">{size(free)} free on this computer</p>{/if}
				{#if error}<p class="error">{error}</p>{/if}
				{#if info?.ready}
					<button class="plate primary" disabled={busy} onclick={use}>Start</button>
				{:else}
					<button
						class="plate primary"
						disabled={busy || !listed || info?.blocked}
						onclick={download}
					>
						{listed?.download.state === 'paused' ? 'Continue download' : 'Download and start'}
					</button>
				{/if}
				<button class="link" onclick={finish}>Skip for now</button>
			{/if}
			{#if engineInstall?.state === 'downloading'}
				<p class="muted small">
					{engine.label(engineInstall.engine)} is downloading in the background, {percent(
						engineInstall.done,
						engineInstall.total
					)}%
				</p>
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
		--c: var(--cut-m);
		padding: 12px 14px;
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
		--c: var(--cut-m);
		padding: 14px;
	}

	.small {
		font-size: var(--fs-body);
		margin-top: -8px;
	}

	.engines {
		display: grid;
		gap: 4px;
	}

	.option {
		width: 100%;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		text-align: left;
	}

	.option:hover,
	.option[aria-checked='true'] {
		background-color: var(--steel);
	}

	.option small {
		display: block;
		font-size: var(--fs-body);
	}

	.option b {
		font-weight: 600;
	}

	/* a square radio, yellow once it's picked */
	.option i {
		width: 13px;
		height: 13px;
		border: var(--hairline) solid var(--slate);
	}

	.option[aria-checked='true'] i {
		border-color: var(--signal);
		background: var(--signal);
		box-shadow: inset 0 0 0 2px var(--void);
	}

	.best {
		--line: color-mix(in srgb, var(--signal) 40%, transparent);
		margin-left: 8px;
		color: var(--signal);
	}

	.others summary {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		list-style: none;
		cursor: pointer;
		font-size: var(--fs-body);
		color: var(--slate);
	}

	.others summary::-webkit-details-marker {
		display: none;
	}

	.others summary:hover {
		color: var(--bone);
	}

	.others[open] summary :global(svg) {
		rotate: 180deg;
	}
</style>
