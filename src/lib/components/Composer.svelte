<script lang="ts">
	import Icon from './Icon.svelte';
	import ModelChip from './ModelChip.svelte';
	import { percent } from '#lib/format.ts';
	import { describe, models } from '#lib/state/models.svelte.ts';
	import { settings } from '#lib/state/settings.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	let {
		draft: key,
		streaming = false,
		blocked = '',
		onsend,
		onstop
	}: {
		draft: string;
		streaming?: boolean;
		// why this chat can't take a message right now
		blocked?: string;
		// return false to keep the text in the box
		onsend: (text: string) => unknown;
		onstop?: () => void;
	} = $props();

	let box: HTMLTextAreaElement;
	let text = $state(read());

	const model = $derived(models.inUse);
	const missing = $derived(model && !describe(model).ready);
	const active = $derived(models.active);
	const ready = $derived(tiles.server === 'on' && !missing && !blocked);

	function read() {
		try {
			return localStorage.getItem(`tiles.draft.${key}`) ?? '';
		} catch {
			return '';
		}
	}

	$effect(() => {
		try {
			if (text) localStorage.setItem(`tiles.draft.${key}`, text);
			else localStorage.removeItem(`tiles.draft.${key}`);
		} catch {
			// drafts last until a reload
		}
	});

	$effect(() => {
		void text;
		box.style.height = 'auto';
		box.style.height = `${box.scrollHeight}px`;
	});

	async function send() {
		if (!text.trim() || !ready || streaming) return;
		const sent = text;
		text = '';
		if ((await onsend(sent)) === false) text = sent;
	}

	function keydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.isComposing) return;
		if (e.shiftKey !== settings.sendOnEnter) {
			e.preventDefault();
			send();
		}
	}

	async function start() {
		try {
			await tiles.startServer();
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}
</script>

<form
	class="composer tile"
	onsubmit={(e) => {
		e.preventDefault();
		send();
	}}
>
	<!-- svelte-ignore a11y_autofocus -->
	<textarea
		bind:this={box}
		bind:value={text}
		onkeydown={keydown}
		placeholder="Type a message…"
		rows="1"
		aria-label="Message"
		autofocus></textarea>
	<div class="bar">
		{#if blocked}
			<span class="note muted">{blocked}</span>
		{:else if tiles.server === 'off'}
			<button type="button" class="chip alert" onclick={start}>Model server off · Start</button>
		{:else if tiles.server === 'starting'}
			<span class="chip"><span class="live-dot"></span>Starting the model server…</span>
		{:else if missing && active && active === model && 'done' in active.download}
			<a
				class="chip"
				href="/models"
				title="Downloading {active.label}. You can send once it's done"
			>
				<span class="live-dot"></span>Downloading {percent(
					active.download.done,
					active.download.total
				)}%
			</a>
		{:else if missing}
			<a class="chip alert" href="/models">No model yet · Download</a>
		{:else}
			<ModelChip disabled={streaming} />
		{/if}
		{#if streaming}
			<button type="button" class="send stop tile" aria-label="Stop" onclick={onstop}>
				<Icon name="stop" size={15} />
			</button>
		{:else}
			<button class="send tile" aria-label="Send" disabled={!ready || !text.trim()}>
				<Icon name="up" size={15} />
			</button>
		{/if}
	</div>
</form>

<style>
	.composer {
		--r: var(--radius-l);
		background-color: var(--steel);
		display: grid;
		gap: 10px;
		padding: 12px 12px 10px 14px;
	}

	.composer:focus-within {
		--line: var(--edge);
	}

	textarea {
		max-height: 200px;
		/* it wraps, and WebKit under the root zoom still thinks it's wider than it is */
		overflow-x: hidden;
		border: 0;
		background: none;
		outline: none;
		resize: none;
		font-size: var(--fs-read);
		line-height: 1.5;
	}

	textarea::placeholder {
		color: var(--slate);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
	}

	.note {
		margin-right: auto;
		font-size: var(--fs-body);
	}

	a.chip {
		text-decoration: none;
	}

	.send {
		--line: var(--bone);
		width: 30px;
		height: 30px;
		flex: none;
		display: grid;
		place-items: center;
		background-color: var(--bone);
		color: var(--void);
	}

	.send:disabled {
		--line: var(--rule);
		background-color: var(--lift);
		color: var(--slate);
		cursor: default;
	}

	/* a reply is running */
	.send.stop {
		--line: var(--signal);
		background-color: var(--signal);
	}
</style>
