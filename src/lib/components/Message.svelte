<script lang="ts">
	import Elapsed from './Elapsed.svelte';
	import Icon from './Icon.svelte';
	import Markdown from './Markdown.svelte';
	import { blockKey } from '#lib/pi.ts';
	import type { Turn } from '#lib/state/chat.svelte.ts';
	import { models } from '#lib/state/models.svelte.ts';
	import { settings } from '#lib/state/settings.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	let { turn, onretry }: { turn: Turn; onretry?: () => void } = $props();

	const live = $derived(turn.state === 'streaming');
	const waiting = $derived(live && turn.phase === 'waiting');
	// the block being written right now, when it's reasoning
	const reasoning = $derived(
		live && turn.phase === 'reasoning' && turn.messages?.length
			? blockKey(turn.messages.length - 1, turn.messages.at(-1)!.content.length - 1)
			: null
	);
	const seconds = (ms: number) => (ms < 1000 ? 'a moment' : `${Math.round(ms / 1000)}s`);

	const brief = (args: unknown) => {
		const values = args && typeof args === 'object' ? Object.values(args) : [args];
		return values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
	};

	async function copy() {
		await navigator.clipboard.writeText(turn.text);
		toasts.show('Copied');
	}
</script>

{#if turn.role === 'user'}
	<div class="user">
		{#if settings.userMarkdown}<Markdown text={turn.text} />{:else}<p>{turn.text}</p>{/if}
	</div>
{:else}
	<article class="reply">
		{#if turn.messages}
			{#each turn.messages as message, m (m)}
				{#each message.content as block, b (b)}
					{@const key = blockKey(m, b)}
					{@const time = turn.thought?.[key]}
					{#if block.type === 'thinking' && block.thinking.trim()}
						<details class="reasoning" open={key === reasoning && settings.openReasoning}>
							<summary>
								<Icon name="brain" size={13} />
								{#if key === reasoning}
									<span class="shimmer">Reasoning…</span>
									{#if time}<Elapsed since={time.start} />{/if}
								{:else if time?.ms != null}
									Reasoned for {seconds(time.ms)}
								{:else}
									Reasoning
								{/if}
							</summary>
							<p>{block.thinking}</p>
						</details>
					{:else if block.type === 'toolCall'}
						{@const run = turn.tools?.[block.id]}
						<details class="tool" open={settings.toolDetails}>
							<summary>
								<Icon name="tool" size={13} />
								<code>{block.name}</code>
								<span class="args muted">{brief(block.arguments)}</span>
								{#if run?.failed}<span class="error">failed</span>
								{:else if !run?.done && live}<span class="spin"></span>
								{:else if !run?.done}<span class="muted">stopped</span>{/if}
							</summary>
							<pre>{JSON.stringify(block.arguments, null, 2)}</pre>
							{#if run?.output}<pre class="output">{run.output}</pre>{/if}
						</details>
					{:else if block.type === 'text' && block.text}
						<Markdown text={block.text} />
					{/if}
				{/each}
			{/each}
			{#if waiting}
				<p class="status" role="status">
					<span class="shimmer">
						{tiles.model?.state === 'loaded'
							? 'Thinking…'
							: `Loading ${models.inUse?.label ?? 'the model'}…`}
					</span>
					{#if turn.since}<Elapsed since={turn.since} />{/if}
				</p>
			{/if}
		{:else}
			<Markdown text={turn.text} />
		{/if}

		{#if turn.state === 'failed'}
			<p class="error">
				{turn.error}
				{#if onretry}<button class="plate" onclick={onretry}>Retry</button>{/if}
			</p>
		{:else if turn.state === 'stopped'}
			<p class="muted small">Stopped</p>
		{/if}

		{#if !live && turn.text}
			<button class="copy" onclick={copy} aria-label="Copy the reply"
				><Icon name="copy" size={13} /></button
			>
		{/if}
	</article>
{/if}

<style>
	.user {
		justify-self: end;
		max-width: 80%;
		padding: 9px 13px;
		border: var(--hairline) solid var(--rule);
		border-radius: var(--radius);
		background: var(--steel);
		white-space: pre-wrap;
	}

	.user :global(.md) {
		white-space: normal;
	}

	.reply {
		display: grid;
		gap: 12px;
		min-width: 0;
	}

	details {
		min-width: 0;
	}

	summary {
		display: flex;
		align-items: center;
		gap: 8px;
		list-style: none;
		cursor: pointer;
		font-size: var(--fs-body);
		color: var(--slate);
	}

	summary::-webkit-details-marker {
		display: none;
	}

	.reasoning {
		padding: 2px 0 2px 12px;
		border-left: var(--hairline) solid var(--rule);
		color: var(--slate);
	}

	.status {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--fs-body);
	}

	.reasoning summary :global(.elapsed) {
		margin-left: 2px;
	}

	.reasoning p {
		margin-top: 6px;
		white-space: pre-wrap;
	}

	.shimmer {
		background: linear-gradient(90deg, var(--slate) 20%, var(--signal) 50%, var(--slate) 80%) 0 0 /
			200% 100%;
		background-clip: text;
		color: transparent;
		animation: shimmer 2.2s linear infinite;
	}

	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}

	.tool {
		padding: 8px 11px;
		border: var(--hairline) solid var(--rule);
		border-radius: 8px;
	}

	.tool code {
		font-family: var(--font-mono);
		font-size: var(--fs-mono);
		color: var(--bone);
	}

	.args {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tool summary > :last-child:not(.args) {
		margin-left: auto;
	}

	pre {
		margin-top: 8px;
		max-height: 320px;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: var(--fs-mono);
		color: var(--ash);
		white-space: pre-wrap;
	}

	.output {
		padding-top: 8px;
		border-top: var(--hairline) solid var(--rule);
	}

	.error {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.error .plate {
		padding: 4px 10px;
		font-size: var(--fs-body);
		color: var(--bone);
	}

	.small {
		font-size: var(--fs-body);
	}

	.copy {
		justify-self: start;
		padding: 4px;
		border-radius: 6px;
		color: var(--slate);
		opacity: 0;
		transition: opacity var(--dur-state);
	}

	.reply:hover .copy,
	.copy:focus-visible {
		opacity: 1;
	}

	@media (hover: none) {
		.copy {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shimmer {
			animation: none;
		}
	}
</style>
