<script lang="ts">
	import Composer from '#lib/components/Composer.svelte';
	import { chats } from '#lib/state/chat.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	async function start(text: string) {
		try {
			await chats.start(text);
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}
</script>

<section>
	<h1>Hello there</h1>
	<p class="muted">Type a message to get started</p>
	<div class="box">
		<Composer
			draft="new"
			blocked={chats.live?.streaming ? 'Tiles is answering another chat' : ''}
			onsend={start}
		/>
	</div>
</section>

<style>
	/* one column up to 620px wide, sized by the space beside the sidebar */
	section {
		flex: 1;
		display: grid;
		grid-template-columns: minmax(0, 620px);
		place-content: center;
		gap: 6px;
		padding: 0 24px;
		text-align: center;
	}

	h1 {
		font-size: 26px;
		font-weight: 600;
		letter-spacing: var(--tracking-display);
	}

	.box {
		margin-top: 16px;
		text-align: left;
	}
</style>
