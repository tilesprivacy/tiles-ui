<script lang="ts">
	interface Props {
		class?: string;
		/** 0 to 100 */
		percent: number;
		size?: number;
	}

	let { class: className = '', percent, size = 22 }: Props = $props();

	const stroke = 2;
	let radius = $derived((size - stroke) / 2);
	let circumference = $derived(2 * Math.PI * radius);
	let offset = $derived(circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100));
</script>

<svg
	aria-hidden="true"
	class="pointer-events-none -rotate-90 {className}"
	height={size}
	viewBox="0 0 {size} {size}"
	width={size}
>
	<circle
		class="stroke-steel"
		cx={size / 2}
		cy={size / 2}
		fill="none"
		r={radius}
		stroke-width={stroke}
	/>

	<circle
		class="stroke-signal transition-[stroke-dashoffset] duration-300"
		cx={size / 2}
		cy={size / 2}
		fill="none"
		r={radius}
		stroke-dasharray={circumference}
		stroke-dashoffset={offset}
		stroke-linecap="round"
		stroke-width={stroke}
	/>
</svg>
