<script lang="ts">
	interface Props {
		current: number;
		total?: number;
	}

	let { current, total = 3 }: Props = $props();
</script>

<div class="flex items-center gap-3" aria-label={`Step ${current} of ${total}`}>
	<div class="flex gap-1.5">
		{#each Array.from({ length: total }, (_, index) => index + 1) as step (step)}
			<span
				class="h-1 w-7 transition-colors {step <= current ? 'bg-signal' : 'bg-steel'}"
				aria-hidden="true"
			></span>
		{/each}
	</div>

	<span class="text-xs text-slate">Step {current} of {total}</span>
</div>
