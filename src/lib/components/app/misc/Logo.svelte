<script>
	import logoMark from '$lib/assets/logo.svg?raw';
	let { class: className = '', style = '' } = $props();
</script>

<div class="{className} flex items-center justify-center" {style}>
	{@html logoMark}
</div>

<style>
	div :global(svg) {
		width: var(--size, 1.4rem);
		height: var(--size, 1.4rem);
	}
</style>
