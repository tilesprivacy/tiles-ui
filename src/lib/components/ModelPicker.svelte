<script lang="ts">
	import Icon from './Icon.svelte';
	import { describe } from '#lib/state/models.svelte.ts';
	import type { Model } from '#lib/types.ts';

	let { options, value = $bindable() }: { options: Model[]; value: string | null } = $props();

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
		class="current"
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
		<ul role="listbox">
			{#each options as model (model.id)}
				{@const info = describe(model)}
				<li role="option" aria-selected={model.model === value} aria-disabled={info.blocked}>
					<button disabled={info.blocked} onclick={() => pick(model.model)} onkeydown={close}>
						<span class="name">
							{model.label}{#if model.default}<span class="tag">Default</span>{/if}
						</span>
						<span class="muted">{info.size}</span>
						{#if info.note}<span class="note muted">{info.note}</span>{/if}
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
		border: var(--hairline) solid var(--rule);
		border-radius: 8px;
		background: var(--steel);
		color: var(--slate);
		text-align: left;
	}

	.current:is(:focus-visible, [aria-expanded='true']) {
		border-color: var(--signal);
		outline: none;
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
		padding: 4px;
		list-style: none;
		border: var(--hairline) solid var(--rule);
		border-radius: 8px;
		background: var(--void);
	}

	li button {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 12px;
		padding: 8px 10px;
		border-radius: 6px;
		text-align: left;
	}

	li button:is(:hover, :focus-visible):not(:disabled),
	li[aria-selected='true'] button {
		background: var(--steel);
		outline: none;
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
