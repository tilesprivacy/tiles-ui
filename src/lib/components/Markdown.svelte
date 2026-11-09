<script lang="ts">
	import { hasMath, loadMath, renderer } from '#lib/markdown.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	let { text }: { text: string } = $props();

	const render = renderer();
	let mathReady = $state(false);

	$effect(() => {
		if (!mathReady && hasMath(text)) loadMath().then(() => (mathReady = true));
	});

	const html = $derived.by(() => {
		void mathReady;
		return render(text);
	});

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
		line-height: var(--lh-read);
		overflow-wrap: anywhere;
	}

	.md :global(:is(ul, ol)) {
		padding-left: 1.3em;
		display: grid;
		gap: 4px;
	}

	.md :global(li::marker) {
		color: var(--slate);
	}

	.md :global(:is(h1, h2, h3, h4)) {
		font-size: 1.05em;
		font-weight: 600;
		line-height: 1.35;
		letter-spacing: var(--tracking-display);
		color: var(--bone);
	}

	/* a heading opens a new part of the reply, set apart from the one before */
	.md :global(:is(h1, h2, h3, h4):not(:first-child)) {
		margin-top: 12px;
	}

	.md :global(h1) {
		font-size: 1.35em;
	}

	.md :global(h2) {
		font-size: 1.18em;
	}

	.md :global(:is(strong, b)) {
		font-weight: 600;
	}

	.md :global(a) {
		color: var(--bone);
		text-underline-offset: 3px;
		text-decoration-color: var(--slate);
	}

	.md :global(a:hover) {
		text-decoration-color: var(--signal);
	}

	.md :global(blockquote) {
		padding: 2px 0 2px 14px;
		border-left: 2px solid var(--edge);
		color: var(--slate);
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

	.md :global(.math) {
		overflow-x: auto;
		overflow-y: hidden;
	}

	/* a table is a tile, scrolled sideways when it's wider than the reply */
	.md :global(table) {
		display: block;
		width: fit-content;
		max-width: 100%;
		overflow-x: auto;
		border: var(--hairline) solid var(--rule);
		border-radius: var(--radius-m);
		border-spacing: 0;
	}

	.md :global(:is(th, td)) {
		padding: 7px 14px;
		border-bottom: var(--hairline) solid var(--rule);
		text-align: left;
	}

	.md :global(tr:last-child td) {
		border-bottom: 0;
	}

	.md :global(th) {
		background-color: var(--panel);
		color: var(--slate);
		font-size: var(--fs-body);
		font-weight: 500;
	}

	.md :global(.code) {
		--r: var(--radius-m);
		background-color: var(--steel);
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
		color: var(--code-text);
		tab-size: 4;
	}

	.md :global(:is(.hljs-keyword, .hljs-selector-tag, .hljs-section, .hljs-name)) {
		color: var(--code-keyword);
	}

	.md :global(:is(.hljs-string, .hljs-regexp, .hljs-symbol, .hljs-char)) {
		color: var(--code-string);
	}

	.md :global(:is(.hljs-number, .hljs-literal)) {
		color: var(--code-number);
	}

	.md :global(:is(.hljs-title, .hljs-function, .hljs-selector-id)) {
		color: var(--code-function);
	}

	.md :global(:is(.hljs-type, .hljs-built_in, .hljs-title.class_, .hljs-selector-class)) {
		color: var(--code-type);
	}

	.md :global(:is(.hljs-meta, .hljs-attr, .hljs-attribute, .hljs-property, .hljs-variable)) {
		color: var(--code-meta);
	}

	.md :global(.hljs-comment) {
		color: var(--code-comment);
		font-style: italic;
	}

	.md :global(.hljs-addition) {
		color: var(--code-added);
	}

	.md :global(.hljs-deletion) {
		color: var(--code-removed);
	}
</style>
