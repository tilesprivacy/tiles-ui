<script lang="ts">
	import Icon from './Icon.svelte';
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
		onsend: (text: string) => void;
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

	function send() {
		if (!text.trim() || !ready || streaming) return;
		onsend(text);
		text = '';
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
	class="composer"
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
			<span class="chip"><span class="dot"></span>Starting the model server…</span>
		{:else if missing && active && active === model && 'done' in active.download}
			<a
				class="chip"
				href="/models"
				title="Downloading {active.label}. You can send once it's done"
			>
				<span class="dot"></span>Downloading {percent(active.download.done, active.download.total)}%
			</a>
		{:else if missing}
			<a class="chip alert" href="/models">No model yet · Download</a>
		{:else if tiles.model?.state === 'loading'}
			<span class="chip"><span class="dot"></span>Loading model…</span>
		{:else if model}
			<span class="chip">{model.label}</span>
		{/if}
		{#if streaming}
			<button type="button" class="send stop" aria-label="Stop" onclick={onstop}>
				<Icon name="stop" size={15} />
			</button>
		{:else}
			<button class="send" aria-label="Send" disabled={!ready || !text.trim()}>
				<Icon name="up" size={15} />
			</button>
		{/if}
	</div>
</form>

<style>
	.composer {
		display: grid;
		gap: 10px;
		padding: 12px 12px 10px 14px;
		border: var(--hairline) solid var(--rule);
		border-radius: 14px;
		background: var(--steel);
	}

	.composer:focus-within {
		border-color: color-mix(in srgb, var(--bone) 22%, transparent);
	}

	textarea {
		max-height: 200px;
		border: 0;
		background: none;
		outline: none;
		resize: none;
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

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--signal);
	}

	.send {
		width: 30px;
		height: 30px;
		flex: none;
		display: grid;
		place-items: center;
		background: var(--signal);
		color: var(--void);
		clip-path: var(--clip-cut);
	}

	.send:disabled {
		background: var(--rule);
		color: var(--slate);
		cursor: default;
	}

	.send.stop {
		background: var(--bone);
	}
</style>
