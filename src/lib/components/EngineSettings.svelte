<script lang="ts">
	import Progress from './Progress.svelte';
	import { size, vram } from '#lib/format.ts';
	import { engine, installing } from '#lib/state/engine.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';
	import type { EngineName } from '#lib/types.ts';

	const status = $derived(engine.status);
	const install = $derived(status?.download);
	const busy = $derived(!!install && installing(install));
	const wanted = $derived(status?.engines.find((e) => e.engine === status.engine));

	engine.load();

	async function act(work: () => Promise<unknown>) {
		try {
			await work();
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}

	const pick = (name: EngineName | 'auto') => act(() => engine.select(name));
</script>

{#if engine.reason && !status}
	<p class="error">{engine.reason}</p>
	<button class="plate" onclick={() => engine.load()}>Try again</button>
{:else if status && install}
	<p class="muted intro">
		The engine is the build of llama.cpp that runs your models. Tiles picks the fastest one for this
		computer.
	</p>

	<div class="now tile">
		<span class="muted">Models run on</span>
		<b>{engine.runsOn.charAt(0).toUpperCase() + engine.runsOn.slice(1)}</b>
		<span class="muted small">
			{[
				engine.gpu?.vram ? `${vram(engine.gpu.vram)} of GPU memory` : '',
				status.nvidia_driver ? `NVIDIA driver ${status.nvidia_driver}` : '',
				`llama.cpp ${status.llama_cpp}`
			]
				.filter(Boolean)
				.join(', ')}
		</span>
		{#if status.override}
			<p class="small">
				Replies use the llama-server in TILES_LLAMA_SERVER_BIN, whatever is picked here:
				<span class="mono">{status.override}</span>
			</p>
		{/if}
	</div>

	{#if install.state === 'downloading' || install.state === 'paused'}
		<div class="install">
			<span>Downloading {engine.label(install.engine)}</span>
			<Progress download={install} />
			{#if install.state === 'downloading'}
				<button class="plate ghost" onclick={() => act(() => engine.pause())}>Pause</button>
			{:else}
				<button class="plate" onclick={() => act(() => engine.download())}>Continue</button>
			{/if}
		</div>
	{:else if install.state === 'unpacking' || install.state === 'checking'}
		<div class="install">
			<span class="wait">
				<span class="spin"></span>
				{install.state === 'unpacking'
					? `Unpacking ${engine.label(install.engine)}…`
					: `Checking ${engine.label(install.engine)} runs here…`}
			</span>
		</div>
	{:else if install.state === 'failed'}
		<div class="install">
			<p class="error">{install.reason}</p>
			<button class="plate" onclick={() => act(() => engine.download())}>Try again</button>
		</div>
	{:else if status.needs_download && wanted}
		<div class="install">
			<span>
				{wanted.label} isn't downloaded yet. Until it is, models keep running on {engine.running ===
				'cpu'
					? 'the CPU'
					: engine.label(engine.running)}.
			</span>
			<button class="plate primary" onclick={() => act(() => engine.download())}>
				Download {size(wanted.download)}
			</button>
		</div>
	{/if}

	<fieldset disabled={busy}>
		<legend>Run models with</legend>
		<label class="choice tile row-tile">
			<input
				type="radio"
				name="engine"
				checked={status.pick === 'auto'}
				onchange={() => pick('auto')}
			/>
			<span
				>Automatic<small class="muted">{engine.label(status.auto)} for this computer</small></span
			>
		</label>
		{#each status.engines as choice (choice.engine)}
			<label class="choice tile row-tile" class:off={choice.unavailable}>
				<input
					type="radio"
					name="engine"
					checked={status.pick === choice.engine}
					disabled={!!choice.unavailable}
					onchange={() => pick(choice.engine)}
				/>
				<span
					>{choice.label}<small class="muted"
						>{choice.unavailable ??
							(status.installed?.engine === choice.engine
								? 'On this computer'
								: choice.download
									? `${size(choice.download)} download`
									: 'Comes with Tiles')}</small
					></span
				>
			</label>
		{/each}
		{#if busy}<p class="muted small">Pause the download to pick another engine.</p>{/if}
	</fieldset>
{:else}
	<span class="spin"></span>
{/if}

<style>
	.intro {
		padding-bottom: 10px;
		font-size: var(--fs-body);
	}

	.now {
		--c: var(--cut-m);
		display: grid;
		gap: 3px;
		padding: 12px 14px;
		background-color: var(--steel);
	}

	.now b {
		font-weight: 600;
	}

	.now p {
		margin-top: 6px;
		color: var(--ash);
	}

	.small {
		font-size: var(--fs-body);
	}

	.install {
		display: grid;
		gap: 10px;
		padding: 14px 0 4px;
	}

	.install .plate {
		justify-self: start;
	}

	.wait {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--ash);
	}

	fieldset {
		display: grid;
		gap: 2px;
		margin-top: 16px;
		border: 0;
	}

	legend {
		padding-bottom: 8px;
		font-weight: 600;
	}

	.choice {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 9px 10px;
		cursor: pointer;
	}

	.choice:hover:not(.off) {
		background-color: var(--steel);
	}

	.choice.off {
		cursor: default;
		color: var(--slate);
	}

	.choice small {
		display: block;
		font-size: var(--fs-body);
	}

	input[type='radio'] {
		appearance: none;
		width: 13px;
		height: 13px;
		flex: none;
		border: var(--hairline) solid var(--slate);
	}

	input[type='radio']:checked {
		border-color: var(--signal);
		background: var(--signal);
		box-shadow: inset 0 0 0 2px var(--panel);
	}

	input[type='radio']:focus-visible {
		outline: var(--hairline) solid var(--signal);
		outline-offset: 2px;
	}

	fieldset:disabled .choice {
		cursor: default;
	}
</style>
