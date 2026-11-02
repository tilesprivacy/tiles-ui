<script lang="ts">
	import Icon from './Icon.svelte';
	import { vram } from '#lib/format.ts';
	import type { Gpu } from '#lib/types.ts';

	let { gpu, driver = null }: { gpu?: Gpu; driver?: string | null } = $props();

	const details = $derived(
		[
			gpu?.compute_capability ? `Compute ${gpu.compute_capability}` : '',
			gpu?.vendor === 'nvidia' && driver ? `Driver ${driver}` : ''
		]
			.filter(Boolean)
			.join(', ')
	);
</script>

<div class="gpu tile">
	<Icon name="chip" size={18} />
	{#if gpu?.name}
		<span class="name">{gpu.name}</span>
		{#if gpu.vram}<span class="chip">{vram(gpu.vram)}</span>{/if}
		{#if details}<span class="muted">{details}</span>{/if}
	{:else}
		<span class="name">No GPU found</span>
		<span class="muted">Models run on the CPU</span>
	{/if}
</div>

<style>
	.gpu {
		--c: var(--cut-m);
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 2px 12px;
		padding: 12px 14px;
		background-color: var(--steel);
		text-align: left;
	}

	.gpu :global(svg) {
		grid-row: span 2;
		color: var(--signal);
	}

	.name {
		font-weight: 600;
	}

	.muted {
		grid-column: 2 / -1;
		font-size: var(--fs-body);
	}
</style>
