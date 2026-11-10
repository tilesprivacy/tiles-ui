<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import Progress from '#lib/components/Progress.svelte';
	import type { Model } from '#lib/types.ts';
	import { size } from '#lib/format.ts';
	import { describe, isListed, models, running } from '#lib/state/models.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	const free = $derived(models.list.find(isListed)?.free_disk);
	// the row asking whether to delete
	let confirming = $state<string | null>(null);

	async function remove(model: Model) {
		confirming = null;
		const unload = model === models.inUse;
		try {
			const { freed, current } = await models.remove(model.model!, unload);
			if (!unload) {
				toasts.show(`Deleted ${model.label}, ${size(freed)} freed`);
				return;
			}
			const next = models.list.find((m) => m.model === current);
			toasts.show(
				`Deleted ${model.label}. ${next ? `Chats use ${next.label} now` : 'Download a model to keep chatting'}`
			);
			// the model server stopped with it
			tiles.ping();
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}

	let ejecting = $state(false);

	// picks it, and starts the model server when it's off
	async function run(model: Model) {
		if (model !== models.inUse) await models.use(model.model!);
		if (tiles.server === 'off') await tiles.startServer();
	}

	async function eject() {
		ejecting = true;
		try {
			await tiles.stopServer();
		} finally {
			ejecting = false;
		}
	}

	async function act(work: Promise<void>) {
		try {
			await work;
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}
</script>

<svelte:head><title>Models · Tiles</title></svelte:head>

<section>
	<header>
		<h1>Models</h1>
		<p class="muted">
			Tiles runs these on your computer.{#if free != null}&nbsp;{size(free)} free.{/if}
		</p>
	</header>

	{#if models.reason}
		<p class="error">{models.reason}</p>
		<button class="plate" onclick={() => models.load()}>Try again</button>
	{:else}
		<ul class="tile">
			{#each models.list as model (model.id)}
				{@const info = describe(model)}
				{@const picked = model === models.inUse}
				<li class:off={info.blocked}>
					<div class="info">
						<b
							>{model.label}{#if model.default}<span class="tag">Default</span>{/if}</b
						>
						{#if isListed(model) && (running(model.download) || model.download.state === 'paused')}
							<Progress download={model.download} />
						{:else if info.ready}
							<span class="tags">
								<span class="chip">{info.note}</span>
								{#if picked && tiles.server === 'on'}
									<span class="chip"><span class="live-dot"></span>In use</span>
								{/if}
								{#if isListed(model) && (model.total ?? model.on_disk)}
									<span class="muted">{size(model.total ?? model.on_disk)}</span>
								{/if}
							</span>
						{:else}
							<span class="muted">{[info.size, info.note].filter(Boolean).join(' · ')}</span>
						{/if}
					</div>
					{#if confirming === model.model}
						<span class="ask"
							>{!info.ready
								? 'Discard the download?'
								: picked
									? 'Chats use it. Unload and delete it?'
									: 'Delete it from this computer?'}</span
						>
						<button class="plate ghost" onclick={() => (confirming = null)}>Cancel</button>
						<button class="plate danger" onclick={() => remove(model)}>
							{info.ready ? 'Delete' : 'Discard'}
						</button>
					{:else if info.ready}
						<button
							class="icon tile row-tile"
							aria-label="Delete {model.label}"
							title="Delete"
							onclick={() => (confirming = model.model)}><Icon name="trash" size={15} /></button
						>
						{#if picked && tiles.server === 'starting'}
							<button class="plate act" disabled><span class="spin"></span>Starting…</button>
						{:else if picked && tiles.server === 'on'}
							<button class="plate ghost act" disabled={ejecting} onclick={() => act(eject())}>
								{#if ejecting}<span class="spin"></span>Ejecting…{:else}Eject model{/if}
							</button>
						{:else}
							<button class="plate act" onclick={() => act(run(model))}>Run model</button>
						{/if}
					{:else if isListed(model) && !info.blocked}
						{#if running(model.download)}
							<button class="plate ghost act" onclick={() => act(models.pause(model.model))}
								>Pause</button
							>
						{:else}
							{#if model.download.state === 'paused'}
								<button
									class="icon tile row-tile"
									aria-label="Discard the {model.label} download"
									title="Discard"
									onclick={() => (confirming = model.model)}><Icon name="trash" size={15} /></button
								>
							{/if}
							<button
								class="plate act"
								disabled={!!models.active}
								onclick={() => act(models.download(model.model))}
							>
								{model.download.state === 'paused' ? 'Continue' : 'Download'}
							</button>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	section {
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
		padding: 48px 24px;
		display: grid;
		align-content: start;
		gap: 20px;
		overflow-y: auto;
	}

	header {
		display: grid;
		gap: 4px;
		margin-bottom: 12px;
	}

	h1 {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: var(--tracking-display);
	}

	ul {
		--r: var(--radius-m);
		list-style: none;
		background-color: var(--panel);
	}

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 13px 16px;
	}

	li + li {
		border-top: var(--hairline) solid var(--rule);
	}

	li.off {
		opacity: 0.45;
	}

	.info {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 6px;
		font-size: var(--fs-body);
	}

	b {
		font-size: 14px;
		font-weight: 500;
	}

	.tag {
		margin-left: 6px;
		font-size: var(--fs-label);
		color: var(--signal);
	}

	.tags {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* one width, so the buttons line up down the list */
	.act {
		min-width: 92px;
	}

	.icon + .act {
		margin-left: -6px;
	}

	.ask {
		font-size: var(--fs-body);
		color: var(--ash);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		color: var(--slate);
	}

	.icon:hover {
		color: var(--alert);
		background-color: var(--steel);
	}

	.danger {
		--line: color-mix(in srgb, var(--alert) 45%, transparent);
		color: var(--alert);
	}

	.plate {
		padding: 6px 12px;
		font-size: var(--fs-body);
	}
</style>
