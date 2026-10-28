<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Composer from '#lib/components/Composer.svelte';
	import Thread from '#lib/components/Thread.svelte';
	import { chats, type Conversation } from '#lib/state/chat.svelte.ts';
	import { sessions } from '#lib/state/sessions.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	let conversation = $state<Conversation | null>(null);

	const id = $derived(page.params.id!);
	const live = $derived(!!conversation && chats.live === conversation);
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
	<Thread
		turns={conversation.turns}
		onretry={live ? (text) => conversation?.send(text) : undefined}
	/>
	<div class="bottom">
		{#if live}
			<Composer
				draft={id}
				streaming={conversation.streaming}
				onsend={(text) => conversation?.send(text)}
				onstop={() => conversation?.stop()}
			/>
		{:else}
			<div class="readonly">
				<span>Continuing older chats is coming. Start a new chat to keep going.</span>
				<a class="plate signal" href="/">New chat</a>
			</div>
		{/if}
	</div>
{/if}

<style>
	.bottom {
		width: 100%;
		max-width: 728px;
		margin: 0 auto;
		padding: 12px 24px 18px;
	}

	.readonly {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		padding: 14px 16px;
		border: var(--hairline) solid var(--rule);
		border-radius: 12px;
		color: var(--ash);
	}

	.readonly .plate {
		padding: 6px 12px;
		font-size: var(--fs-body);
		text-decoration: none;
	}
</style>
