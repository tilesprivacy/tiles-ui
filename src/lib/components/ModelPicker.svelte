<script lang="ts">
	import Icon from './Icon.svelte';
	import { describe, fit } from '#lib/state/models.svelte.ts';
	import type { Model } from '#lib/types.ts';

	let {
		options,
		value = $bindable(),
		vram = null
	}: { options: Model[]; value: string | null; vram?: number | null } = $props();

	let open = $state(false);
	const chosen = $derived(options.find((m) => m.model === value));

	const close = (e: KeyboardEvent) => e.key === 'Escape' && (open = false);

	function pick(model: string | null) {
		value = model;
		open = false;
	}
</script>

<div
	class="picker"
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) open = false;
	}}
>
	<button
		class="current tile"
		aria-haspopup="listbox"
		aria-expanded={open}
		onclick={() => (open = !open)}
		onkeydown={close}
	>
		<span class="name">{chosen?.label ?? 'Pick a model'}</span>
		{#if chosen?.default}<span class="tag">Default</span>{/if}
		<Icon name="chevron" size={14} />
	</button>
	{#if open}
		<ul class="tile" role="listbox">
			{#each options as model (model.id)}
				{@const info = describe(model)}
				<li role="option" aria-selected={model.model === value} aria-disabled={info.blocked}>
					<button
						class="tile row-tile"
						disabled={info.blocked}
						onclick={() => pick(model.model)}
						onkeydown={close}
					>
						<span class="name">
							{model.label}{#if model.default}<span class="tag">Default</span>{/if}
						</span>
						<span class="muted">{info.size}</span>
						{#if info.note || fit(model, vram)}
							<span class="note muted">{info.note || fit(model, vram)}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.picker {
		position: relative;
	}

	.current {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 14px;
		background-color: var(--steel);
		color: var(--slate);
		text-align: left;
	}

	.current:is(:focus-visible, [aria-expanded='true']) {
		--line: var(--signal);
	}

	.current .name {
		color: var(--bone);
	}

	.current :global(svg) {
		margin-left: auto;
	}

	.name {
		font-weight: 600;
	}

	.tag {
		margin-left: 6px;
		font-size: var(--fs-label);
		font-weight: 500;
		color: var(--signal);
	}

	ul {
		position: absolute;
		inset: calc(100% + 6px) 0 auto;
		z-index: 10;
		display: grid;
		--r: var(--radius-m);
		padding: 4px;
		list-style: none;
		background-color: var(--panel);
	}

	li button {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 12px;
		padding: 8px 10px;
		text-align: left;
	}

	li button:is(:hover, :focus-visible):not(:disabled),
	li[aria-selected='true'] button {
		background-color: var(--steel);
	}

	li button:disabled {
		cursor: default;
		opacity: 0.45;
	}

	li .name {
		font-weight: 500;
	}

	.note {
		grid-column: 1 / -1;
		font-size: var(--fs-body);
	}
</style>
