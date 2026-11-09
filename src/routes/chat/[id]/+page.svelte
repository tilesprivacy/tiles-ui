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
	<header class="top">
		<h1>{title}</h1>
		<ShareChat {id} />
	</header>
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
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px 10px 24px;
	}

	h1 {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--fs-title);
		font-weight: 500;
		color: var(--ash);
	}

	/* the thread fades out under the header and over the composer */
	.top::after,
	.bottom::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: var(--fade);
		pointer-events: none;
	}

	.top::after {
		top: 100%;
		background: linear-gradient(var(--void), transparent);
	}

	.bottom {
		position: relative;
		width: 100%;
		max-width: 728px;
		margin: 0 auto;
		padding: 4px 24px 18px;
	}

	.bottom::before {
		bottom: 100%;
		background: linear-gradient(transparent, var(--void));
	}

	/* clear of the button that opens the sidebar */
	@media (max-width: 767px) {
		.top {
			padding-left: 52px;
		}
	}
</style>
