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
	// why a message can't go yet, shown when one is sent anyway
	const why = $derived.by(() => {
		if (ready) return '';
		if (blocked) return blocked;
		if (tiles.server === 'off') return 'The model server is off. Start it first';
		if (tiles.server === 'starting') return 'The model server is still starting';
		if (active && active === model) return 'The model is still downloading';
		return 'No model yet. Download one first';
	});
	let refused = $state(false);
	// the reason, next to the button for a few seconds after a refused send
	let note = $state('');
	let noteTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (!ready) return;
		refused = false;
		note = '';
	});

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
		if (!text.trim() || streaming) return;
		if (!ready) {
			refused = true;
			note = why;
			clearTimeout(noteTimer);
			noteTimer = setTimeout(() => (note = ''), 4000);
			return;
		}
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
			<div class="send-spot">
				<p class="refusal chip alert" class:shown={note} role="status">{note}</p>
				<button
					class="send tile"
					class:refused
					aria-label="Send"
					aria-disabled={!ready}
					title={why || undefined}
					disabled={!text.trim()}
				>
					<Icon name="up" size={15} />
				</button>
			</div>
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

	.send:disabled,
	.send[aria-disabled='true'] {
		--line: var(--rule);
		background-color: var(--lift);
		color: var(--slate);
		cursor: default;
	}

	.send-spot {
		position: relative;
	}

	.refusal {
		position: absolute;
		right: 0;
		bottom: calc(100% + 8px);
		margin: 0;
		background-color: var(--panel);
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--dur-state);
	}

	.refusal.shown {
		opacity: 1;
	}

	/* sent while no model can take it */
	.send.refused {
		--line: var(--alert);
		color: var(--alert);
	}

	/* a reply is running */
	.send.stop {
		--line: var(--signal);
		background-color: var(--signal);
	}
</style>
