<script lang="ts">
	let { since }: { since: number } = $props();

	let now = $state(Date.now());

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const seconds = $derived(Math.max(0, Math.floor((now - since) / 1000)));
</script>

<span class="elapsed"
	>{seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`}</span
>

<style>
	.elapsed {
		font-variant-numeric: tabular-nums;
		color: var(--slate);
	}
</style>
