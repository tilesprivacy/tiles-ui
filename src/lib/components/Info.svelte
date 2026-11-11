<script lang="ts">
	import Icon from './Icon.svelte';

	let { text }: { text: string } = $props();
</script>

<!-- the tip is as wide as the nearest positioned parent -->
<button type="button" class="info" aria-label={text}>
	<Icon name="info" size={13} />
	<span class="tip tile" aria-hidden="true">{text}</span>
</button>

<style>
	.info {
		flex: none;
		display: grid;
		place-items: center;
		color: var(--slate);
		cursor: default;
	}

	.info:hover,
	.info:focus-visible {
		color: var(--bone);
	}

	.tip {
		position: absolute;
		inset: calc(100% + 6px) 0 auto;
		z-index: 1;
		padding: 7px 10px;
		background-color: var(--steel);
		box-shadow: var(--shadow-float);
		font-size: var(--fs-label);
		font-weight: 400;
		line-height: 1.4;
		color: var(--ash);
		text-align: left;
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--dur-state);
	}

	.info:hover .tip,
	.info:focus-visible .tip {
		opacity: 1;
	}
</style>
