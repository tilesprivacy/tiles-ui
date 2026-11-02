<script lang="ts">
	import Icon from './Icon.svelte';
	import { engine } from '#lib/state/engine.svelte.ts';
	import { describe, models } from '#lib/state/models.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	// no switching while a reply runs on it
	let { disabled = false }: { disabled?: boolean } = $props();

	let open = $state(false);

	const model = $derived(models.inUse);
	const load = $derived(tiles.model?.state);
	const onDisk = $derived(models.list.filter((m) => describe(m).ready));
	// repo:quant, the quant is what tells two downloads of a model apart
	const quant = (id: string | null) => id?.split(':')[1] ?? '';

	const close = (e: KeyboardEvent) => e.key === 'Escape' && (open = false);

	async function use(id: string) {
		open = false;
		if (id === model?.model) return;
		try {
			await models.use(id);
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}
</script>

{#if model}
	<div
		class="picker"
		onfocusout={(e) => {
			if (!e.currentTarget.contains(e.relatedTarget as Node)) open = false;
		}}
	>
		<button
			type="button"
			class="chip"
			class:loaded={load === 'loaded'}
			aria-haspopup="listbox"
			aria-expanded={open}
			title={load === 'loaded' ? `${model.label} is loaded` : model.label}
			{disabled}
			onclick={() => (open = !open)}
			onkeydown={close}
		>
			{#if load === 'loading'}<span class="spin"></span>{:else}<Icon name="box" size={13} />{/if}
			<span>{model.label}</span>
			<span class="muted">{load === 'loading' ? 'Loading…' : quant(model.model)}</span>
			<Icon name="chevron" size={12} />
		</button>

		{#if open}
			<div class="menu tile">
				{#if engine.runsOn}<p class="muted">Runs on {engine.runsOn}</p>{/if}
				<ul role="listbox" aria-label="Models on this computer">
					{#each onDisk as m (m.id)}
						<li role="option" aria-selected={m === model}>
							<button
								type="button"
								class="tile row-tile"
								onclick={() => use(m.model!)}
								onkeydown={close}
							>
								<span>{m.label}</span>
								<span class="muted">{quant(m.model)}</span>
								{#if m === model}<Icon name="check" size={13} />{/if}
							</button>
						</li>
					{/each}
				</ul>
				<a href="/models" class="more" onclick={() => (open = false)}>All models</a>
			</div>
		{/if}
	</div>
{/if}

<style>
	.picker {
		position: relative;
		min-width: 0;
	}

	.chip {
		max-width: 100%;
		cursor: pointer;
	}

	.chip:disabled {
		cursor: default;
	}

	.chip span:not(.spin) {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chip :global(svg) {
		flex: none;
		color: var(--slate);
	}

	/* a loaded model is live */
	.chip.loaded :global(svg:first-child) {
		color: var(--signal);
	}

	.chip:hover:not(:disabled),
	.chip[aria-expanded='true'] {
		--line: var(--edge);
	}

	.menu {
		--c: var(--cut-m);
		position: absolute;
		right: 0;
		bottom: calc(100% + 8px);
		z-index: 10;
		width: max(240px, 100%);
		display: grid;
		gap: 2px;
		padding: 6px;
		background-color: var(--panel);
		font-size: var(--fs-body);
	}

	.menu p {
		padding: 4px 8px 6px;
	}

	ul {
		display: grid;
		gap: 1px;
		list-style: none;
	}

	li button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 8px;
		text-align: left;
	}

	li button:is(:hover, :focus-visible),
	li[aria-selected='true'] button {
		background-color: var(--steel);
	}

	li button :global(svg) {
		margin-left: auto;
		color: var(--bone);
	}

	.more {
		padding: 7px 8px 3px;
		border-top: var(--hairline) solid var(--rule);
		color: var(--slate);
		text-decoration: none;
	}

	.more:hover {
		color: var(--bone);
	}
</style>
