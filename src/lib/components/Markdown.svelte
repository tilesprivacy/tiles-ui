<script lang="ts">
	import { renderer } from '#lib/markdown.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	let { text }: { text: string } = $props();

	const render = renderer();
	const html = $derived(render(text));

	async function copy(event: MouseEvent) {
		const button = (event.target as Element).closest('[data-copy]');
		const code = button?.closest('.code')?.querySelector('code')?.textContent;
		if (code == null) return;
		await navigator.clipboard.writeText(code);
		toasts.show('Copied');
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="md" onclick={copy}>{@html html}</div>

<style>
	.md {
		display: grid;
		gap: 10px;
		min-width: 0;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.md :global(:is(ul, ol)) {
		padding-left: 1.3em;
		display: grid;
		gap: 4px;
	}

	.md :global(:is(h1, h2, h3, h4)) {
		font-size: 1.05em;
		font-weight: 600;
		margin-top: 6px;
	}

	.md :global(h1) {
		font-size: 1.25em;
	}

	.md :global(:is(strong, b)) {
		font-weight: 600;
	}

	.md :global(a) {
		color: var(--bone);
		text-underline-offset: 3px;
		text-decoration-color: var(--slate);
	}

	.md :global(blockquote) {
		border-left: var(--hairline) solid var(--rule);
		padding-left: 12px;
		color: var(--ash);
	}

	.md :global(hr) {
		border: 0;
		border-top: var(--hairline) solid var(--rule);
	}

	.md :global(:not(pre) > code) {
		font-family: var(--font-mono);
		font-size: 0.88em;
		color: var(--ash);
		background: var(--steel);
		padding: 1px 5px;
		border-radius: 4px;
	}

	.md :global(table) {
		border-collapse: collapse;
		display: block;
		overflow-x: auto;
	}

	.md :global(:is(th, td)) {
		padding: 6px 14px 6px 0;
		border-bottom: var(--hairline) solid var(--rule);
		text-align: left;
	}

	.md :global(th) {
		color: var(--slate);
		font-weight: 500;
	}

	.md :global(.code) {
		border: var(--hairline) solid var(--rule);
		border-radius: var(--radius);
		background: var(--steel);
		overflow: hidden;
	}

	.md :global(.code-head) {
		display: flex;
		justify-content: space-between;
		padding: 6px 12px;
		border-bottom: var(--hairline) solid var(--rule);
		font-family: var(--font-mono);
		font-size: var(--fs-label);
		color: var(--slate);
	}

	.md :global(.code-head button) {
		color: var(--slate);
	}

	.md :global(.code-head button:hover) {
		color: var(--bone);
	}

	.md :global(pre) {
		padding: 12px;
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: var(--fs-body);
		line-height: 1.55;
		tab-size: 4;
	}

	.md :global(.hljs-keyword),
	.md :global(.hljs-built_in),
	.md :global(.hljs-selector-tag) {
		color: var(--code-keyword);
	}

	.md :global(.hljs-string),
	.md :global(.hljs-attr) {
		color: var(--code-string);
	}

	.md :global(.hljs-number),
	.md :global(.hljs-literal) {
		color: var(--code-number);
	}

	.md :global(.hljs-comment) {
		color: var(--slate);
		font-style: italic;
	}

	.md :global(.hljs-title),
	.md :global(.hljs-function) {
		color: var(--code-title);
	}

	.md :global(.hljs-type),
	.md :global(.hljs-meta) {
		color: var(--ash);
	}

	.md :global(.hljs-addition) {
		color: var(--code-added);
	}

	.md :global(.hljs-deletion) {
		color: var(--alert);
	}
</style>
