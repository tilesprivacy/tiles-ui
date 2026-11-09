<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Composer from '#lib/components/Composer.svelte';
	import ShareChat from '#lib/components/ShareChat.svelte';
	import Thread from '#lib/components/Thread.svelte';
	import { chats, type Conversation } from '#lib/state/chat.svelte.ts';
	import { sessions } from '#lib/state/sessions.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	let conversation = $state<Conversation | null>(null);

	const id = $derived(page.params.id!);
	const title = $derived(sessions.list.find((s) => s.id === id)?.name ?? 'Chat');

	$effect(() => {
		const wanted = id;
		conversation = null;
		chats.open(wanted).then(
			(opened) => {
				if (id === wanted) conversation = opened;
			},
			() => {
				toasts.show("That chat doesn't exist anymore");
				goto('/');
			}
		);
	});
</script>

<svelte:head><title>{title} · Tiles</title></svelte:head>
<svelte:window onkeydown={(e) => e.key === 'Escape' && conversation?.stop()} />

{#if conversation}
	<div class="top"><ShareChat {id} /></div>
	<Thread turns={conversation.turns} onretry={(text) => conversation?.send(text)} />
	<div class="bottom">
		<Composer
			draft={id}
			streaming={conversation.streaming}
			onsend={(text) => conversation?.send(text)}
			onstop={() => conversation?.stop()}
		/>
	</div>
{/if}

<style>
	.top {
		position: absolute;
		top: 10px;
		right: 12px;
		z-index: 5;
	}

	.bottom {
		width: 100%;
		max-width: 728px;
		margin: 0 auto;
		padding: 12px 24px 18px;
	}
</style>
