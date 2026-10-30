<script lang="ts">
	import Icon from './Icon.svelte';
	import Message from './Message.svelte';
	import type { Turn } from '#lib/state/chat.svelte.ts';
	import { settings } from '#lib/state/settings.svelte.ts';

	let { turns, onretry }: { turns: Turn[]; onretry?: (text: string) => void } = $props();

	let scroller: HTMLElement;
	let following = $state(true);

	const atBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40;

	function down(behavior: ScrollBehavior = 'instant') {
		scroller.scrollTo({ top: scroller.scrollHeight, behavior });
		following = true;
	}

	// a new chat, or a reply growing while it's followed
	$effect.pre(() => {
		void turns.length;
		void turns.at(-1)?.text;
		void turns.at(-1)?.messages?.length;
		void turns.at(-1)?.state;
		if (following && settings.followReply) queueMicrotask(() => scroller && down());
	});
</script>

<!-- only the reader scrolling up stops following -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="scroller"
	bind:this={scroller}
	onscroll={() => atBottom() && (following = true)}
	onwheel={(e) => e.deltaY < 0 && (following = false)}
	ontouchmove={() => (following = atBottom())}
	onkeydown={(e) => ['ArrowUp', 'PageUp', 'Home'].includes(e.key) && (following = false)}
	role="log"
>
	<div class="thread">
		{#each turns as turn, i (i)}
			<Message
				{turn}
				onretry={onretry && turn.state === 'failed'
					? () => onretry(turns[i - 1]?.text ?? '')
					: undefined}
			/>
		{/each}
	</div>
</div>

{#if !following}
	<button class="down" aria-label="Scroll to the bottom" onclick={() => down('smooth')}>
		<Icon name="down" size={15} />
	</button>
{/if}

<style>
	.scroller {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-anchor: none;
	}

	.thread {
		width: 100%;
		max-width: 728px;
		margin: 0 auto;
		padding: 26px 24px 24px;
		display: grid;
		align-content: start;
		gap: 18px;
	}

	.down {
		position: absolute;
		left: 50%;
		bottom: 112px;
		translate: -50% 0;
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border: var(--hairline) solid var(--rule);
		border-radius: 50%;
		background: var(--steel);
		color: var(--ash);
	}
</style>
