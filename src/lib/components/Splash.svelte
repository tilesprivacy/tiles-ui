<script lang="ts">
	import Logo from './Logo.svelte';
	import { tiles } from '#lib/state/tiles.svelte.ts';

	let slow = $state(false);

	$effect(() => {
		if (tiles.phase !== 'starting') return;
		slow = false;
		const timer = setTimeout(() => (slow = true), 15000);
		return () => clearTimeout(timer);
	});
</script>

<main>
	<Logo size={34} />
	{#if tiles.phase === 'failed'}
		<h1>Tiles couldn't start</h1>
		<p class="error">{tiles.reason}</p>
		<button class="plate" onclick={() => tiles.boot()}>Try again</button>
	{:else if tiles.phase === 'starting'}
		<h1>Starting Tiles…</h1>
		<p class="muted">Getting the model server ready. This only happens once after Tiles starts.</p>
		{#if slow}<p class="muted">This is taking longer than usual.</p>{/if}
	{/if}
</main>

<style>
	main {
		height: 100%;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 14px;
		padding: 24px;
		text-align: center;
	}

	h1 {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: var(--tracking-display);
	}

	p {
		max-width: 42ch;
	}
</style>
