<script lang="ts">
	import GpuCard from './GpuCard.svelte';
	import Progress from './Progress.svelte';
	import { size } from '#lib/format.ts';
	import { engine, installing } from '#lib/state/engine.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';
	import type { EngineChoice, EngineName } from '#lib/types.ts';

	const status = $derived(engine.status);
	const install = $derived(status?.download);
	const busy = $derived(!!install && installing(install));

	const about: Record<EngineName, string> = {
		'cuda-13': 'NVIDIA GPUs and drivers from the last few years. The fastest on them',
		'cuda-12': 'Older NVIDIA GPUs and drivers',
		vulkan: 'Most GPUs, from AMD, Intel and NVIDIA',
		cpu: 'Any computer. The slowest, and it always works',
		metal: 'The GPU in Apple silicon Macs'
	};

	engine.load();

	async function act(work: () => Promise<unknown>) {
		try {
			await work();
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}

	const onDisk = (choice: EngineChoice) =>
		choice.download === 0 || status?.installed?.engine === choice.engine;

	// the card's install, when it's the one downloading or the one that failed
	const installOf = (name: EngineName) =>
		install && 'engine' in install && install.engine === name && install.state !== 'done'
			? install
			: undefined;

	function use(choice: EngineChoice) {
		act(async () => {
			await engine.select(choice.engine);
			if (!onDisk(choice)) await engine.download();
		});
	}

	// off keeps what runs now, as a pick of its own
	const automatic = (on: boolean) =>
		act(() => engine.select(on ? 'auto' : (engine.running ?? status!.engine)));
</script>

{#if engine.reason && !status}
	<p class="error">{engine.reason}</p>
	<button class="plate" onclick={() => engine.load()}>Try again</button>
{:else if status}
	<section>
		<h4>Hardware</h4>
		{#each status.gpus.filter((g) => g.name) as gpu, i (i)}
			<GpuCard {gpu} driver={status.nvidia_driver} />
		{:else}
			<GpuCard />
		{/each}
	</section>

	{#if status.override}
		<p class="override tile">
			Replies use the llama-server set in TILES_LLAMA_SERVER_BIN, whatever is picked here.
			<span class="mono">{status.override}</span>
		</p>
	{/if}

	<section>
		<div class="head">
			<h4>Engines</h4>
			<span class="muted small">llama.cpp {status.llama_cpp}</span>
		</div>
		<label class="auto">
			<span
				>Pick the engine automatically<small class="muted"
					>Tiles picks {engine.label(status.auto)} for this computer</small
				></span
			>
			<input
				type="checkbox"
				role="switch"
				checked={status.pick === 'auto'}
				disabled={busy}
				onchange={(e) => automatic(e.currentTarget.checked)}
			/>
		</label>

		<div class="grid">
			{#each status.engines as choice (choice.engine)}
				{@const live = engine.running === choice.engine}
				{@const own = installOf(choice.engine)}
				<article
					class="card tile"
					class:live
					class:off={choice.unavailable}
					aria-label={choice.label}
				>
					<header>
						<b>{choice.label}</b>
						{#if live}
							<span class="chip"><span class="live-dot"></span>In use</span>
						{:else if choice.unavailable}
							<span class="chip">Can't run here</span>
						{:else if choice.engine === status.auto}
							<span class="chip best">Best for this computer</span>
						{/if}
					</header>
					<p class="muted">{choice.unavailable ?? about[choice.engine]}</p>

					{#if own?.state === 'downloading' || own?.state === 'paused'}
						<Progress download={own} />
						{#if own.state === 'downloading'}
							<button class="plate ghost" onclick={() => act(() => engine.pause())}>Pause</button>
						{:else}
							<button class="plate" onclick={() => act(() => engine.download())}>Continue</button>
						{/if}
					{:else if own?.state === 'unpacking' || own?.state === 'checking'}
						<span class="wait muted small">
							<span class="spin"></span>
							{own.state === 'unpacking' ? 'Unpacking…' : 'Checking it runs here…'}
						</span>
					{:else if own?.state === 'failed'}
						<p class="error">{own.reason}</p>
						<button class="plate" disabled={busy} onclick={() => act(() => engine.download())}
							>Try again</button
						>
					{:else if !choice.unavailable}
						<footer>
							<span class="muted small">
								{choice.download === 0
									? 'Comes with Tiles'
									: onDisk(choice)
										? 'On this computer'
										: size(choice.download)}
							</span>
							{#if !live}
								<button class="plate" disabled={busy} onclick={() => use(choice)}>
									{onDisk(choice) ? 'Use' : 'Download'}
								</button>
							{/if}
						</footer>
					{/if}
				</article>
			{/each}
		</div>
		{#if busy}<p class="muted small">Pause the download to switch engines.</p>{/if}
	</section>
{:else}
	<span class="spin"></span>
{/if}

<style>
	section {
		display: grid;
		gap: 10px;
		padding-bottom: 22px;
	}

	h4 {
		font-size: var(--fs-body);
		font-weight: 500;
		color: var(--slate);
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.small {
		font-size: var(--fs-body);
	}

	.override {
		--c: var(--cut-m);
		margin-bottom: 20px;
		padding: 10px 12px;
		font-size: var(--fs-body);
		color: var(--ash);
	}

	.override .mono {
		display: block;
		margin-top: 4px;
		color: var(--slate);
	}

	.auto {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 4px 0 8px;
		cursor: pointer;
	}

	.auto small {
		display: block;
		font-size: var(--fs-body);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 10px;
	}

	.card {
		--c: var(--cut-m);
		display: grid;
		align-content: start;
		gap: 8px;
		padding: 12px 14px;
		background-color: var(--panel);
	}

	.card.live {
		--line: var(--edge);
		background-color: var(--steel);
	}

	.card.off {
		color: var(--slate);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	header b {
		font-weight: 600;
	}

	.card p {
		min-height: 2.6em;
		font-size: var(--fs-body);
	}

	.best {
		--line: color-mix(in srgb, var(--signal) 40%, transparent);
		color: var(--signal);
	}

	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-top: 2px;
	}

	.card .plate {
		justify-self: start;
		padding: 5px 12px;
		font-size: var(--fs-body);
	}

	.wait {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
