<script lang="ts">
	import logo from '#lib/assets/logo.svg?raw';

	let { size = 22 }: { size?: number } = $props();
</script>

<span style:width="{size}px" style:height="{size}px">{@html logo}</span>

<style>
	span {
		display: block;
		flex: none;
		color: var(--signal);
	}

	span :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
