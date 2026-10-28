<script lang="ts">
	import { percent, size, timeLeft } from '#lib/format.ts';
	import type { Download } from '#lib/types.ts';

	let { download }: { download: Download } = $props();

	const done = $derived('done' in download ? download.done : 0);
	const total = $derived('total' in download ? download.total : 0);
	const speed = $derived(download.state === 'downloading' ? download.bytes_per_sec : 0);
</script>

<div
	class="bar"
	role="progressbar"
	aria-valuenow={percent(done, total)}
	aria-valuemin={0}
	aria-valuemax={100}
>
	<span style:width="{percent(done, total)}%"></span>
</div>
<div class="meta muted">
	<span>
		{size(done)} of {size(total)}{#if speed}&nbsp;· {size(speed)}/s{/if}
	</span>
	<span>
		{#if download.state === 'verifying'}
			Checking…
		{:else if download.state === 'paused'}
			Paused
		{:else}
			{timeLeft(done, total, speed)}
		{/if}
	</span>
</div>

<style>
	.bar {
		height: 4px;
		background: var(--steel);
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--signal);
		transition: width var(--dur-push) var(--ease-push);
	}

	.meta {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		font-size: var(--fs-body);
		font-variant-numeric: tabular-nums;
	}
</style>
