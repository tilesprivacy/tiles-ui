<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import Progress from '#lib/components/Progress.svelte';
	import type { Model } from '#lib/types.ts';
	import { size } from '#lib/format.ts';
	import { describe, isListed, models, running } from '#lib/state/models.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	const free = $derived(models.list.find(isListed)?.free_disk);
	// the row asking whether to delete
	let confirming = $state<string | null>(null);

	async function remove(model: Model) {
		confirming = null;
		try {
			const freed = await models.remove(model.model!);
			toasts.show(`Deleted ${model.label}, ${size(freed)} freed`);
		} catch (err) {
			toasts.show((err as Error).message);
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
		<ul>
			{#each models.list as model (model.id)}
				{@const info = describe(model)}
				<li class:off={info.blocked}>
					<div class="info">
						<b
							>{model.label}{#if model.default}<span class="tag">Default</span>{/if}</b
						>
						{#if isListed(model) && (running(model.download) || model.download.state === 'paused')}
							<Progress download={model.download} />
						{:else}
							<span class="muted">{[info.size, info.note].filter(Boolean).join(' · ')}</span>
						{/if}
					</div>
					{#if confirming === model.model}
						<span class="ask"
							>{info.ready ? 'Delete it from this computer?' : 'Discard the download?'}</span
						>
						<button class="plate ghost" onclick={() => (confirming = null)}>Cancel</button>
						<button class="plate danger" onclick={() => remove(model)}>
							{info.ready ? 'Delete' : 'Discard'}
						</button>
					{:else if model === models.inUse && info.ready}
						<span class="pill">In use</span>
					{:else if info.ready}
						<button class="plate" onclick={() => act(models.use(model.model!))}>Use</button>
						<button
							class="icon"
							aria-label="Delete {model.label}"
							title="Delete"
							onclick={() => (confirming = model.model)}><Icon name="trash" size={15} /></button
						>
					{:else if isListed(model) && !info.blocked}
						{#if running(model.download)}
							<button class="plate ghost" onclick={() => act(models.pause(model.model))}
								>Pause</button
							>
						{:else}
							<button
								class="plate"
								disabled={!!models.active}
								onclick={() => act(models.download(model.model))}
							>
								{model.download.state === 'paused' ? 'Continue' : 'Download'}
							</button>
							{#if model.download.state === 'paused'}
								<button
									class="icon"
									aria-label="Discard the {model.label} download"
									title="Discard"
									onclick={() => (confirming = model.model)}><Icon name="trash" size={15} /></button
								>
							{/if}
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

	h1 {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: var(--tracking-display);
	}

	ul {
		list-style: none;
		border: var(--hairline) solid var(--rule);
		border-radius: var(--radius);
		overflow: hidden;
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

	.pill {
		padding: 2px 9px;
		border: var(--hairline) solid var(--rule);
		border-radius: 999px;
		font-size: var(--fs-label);
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
		border-radius: 6px;
		color: var(--slate);
	}

	.icon:hover {
		color: var(--alert);
		background: var(--steel);
	}

	.danger {
		border-color: color-mix(in srgb, var(--alert) 45%, transparent);
		color: var(--alert);
	}

	.plate {
		padding: 6px 12px;
		font-size: var(--fs-body);
	}
</style>
