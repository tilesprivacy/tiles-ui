<script lang="ts">
	import { toasts } from '#lib/state/toasts.svelte.ts';
</script>

<ol role="status" aria-live="polite">
	{#each toasts.list as toast (toast.id)}
		<li class="tile">
			<span>{toast.text}</span>
			{#if toast.action}
				<button
					class="plate"
					onclick={() => {
						toast.action?.run();
						toasts.dismiss(toast.id);
					}}>{toast.action.label}</button
				>
			{/if}
		</li>
	{/each}
</ol>

<style>
	ol {
		position: fixed;
		right: 18px;
		bottom: 18px;
		z-index: 50;
		display: grid;
		gap: 8px;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: 360px;
		padding: 10px 14px;
		--c: var(--cut-m);
		background-color: var(--steel);
		font-size: var(--fs-body);
	}

	.plate {
		padding: 4px 10px;
		font-size: var(--fs-label);
	}
</style>
