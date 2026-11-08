<script lang="ts">
	import Icon from './Icon.svelte';
	import Message from './Message.svelte';
	import type { Turn } from '#lib/state/chat.svelte.ts';
	import { settings } from '#lib/state/settings.svelte.ts';

	let { turns, onretry }: { turns: Turn[]; onretry?: (text: string) => void } = $props();

	let scroller: HTMLElement;
	let thread: HTMLElement;
	let following = $state(true);
	let lastTop = 0;

	const atBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40;

	function down(behavior: ScrollBehavior = 'instant') {
		scroller.scrollTo({ top: scroller.scrollHeight, behavior });
		following = true;
	}

	// moving up stops following, only coming back down to the bottom starts it again
	function scrolled() {
		const up = scroller.scrollTop < lastTop;
		lastTop = scroller.scrollTop;
		if (up && !atBottom()) following = false;
		else if (!up && atBottom()) following = true;
	}

	// a message sent, or a chat opened
	$effect(() => {
		void turns.length;
		if (settings.followReply) down();
	});

	// after layout and before paint, so a growing reply never shows a jump
	$effect(() => {
		const grown = new ResizeObserver(() => {
			if (following && settings.followReply) scroller.scrollTop = scroller.scrollHeight;
		});
		grown.observe(thread);
		return () => grown.disconnect();
	});
</script>

<!-- only the reader scrolling up stops following -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="scroller"
	bind:this={scroller}
	onscroll={scrolled}
	onwheel={(e) => e.deltaY < 0 && (following = false)}
	ontouchmove={() => (following = atBottom())}
	onkeydown={(e) => ['ArrowUp', 'PageUp', 'Home'].includes(e.key) && (following = false)}
	role="log"
>
	<div class="thread" bind:this={thread}>
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
	<button class="down tile" aria-label="Scroll to the bottom" onclick={() => down('smooth')}>
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
		background-color: var(--steel);
		color: var(--ash);
	}
</style>
