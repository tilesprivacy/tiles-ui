<script lang="ts">
	import Progress from '#lib/components/Progress.svelte';
	import { size } from '#lib/format.ts';
	import { describe, isListed, models, running } from '#lib/state/models.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	const free = $derived(models.list.find(isListed)?.free_disk);

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
					{#if model === models.inUse && info.ready}
						<span class="pill">In use</span>
					{:else if info.ready}
						<button class="plate" onclick={() => act(models.use(model.model!))}>Use</button>
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

	.plate {
		padding: 6px 12px;
		font-size: var(--fs-body);
	}
</style>
