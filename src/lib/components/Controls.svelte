<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import glyph from '#lib/assets/glyph.svg?raw';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	// Mac menu bar panel's parts
	import Chevron from '#panel/lib/Chevron.svelte';
	import Chip from '#panel/lib/Chip.svelte';
	import CopyMark from '#panel/lib/CopyMark.svelte';
	import CupMark from '#panel/lib/CupMark.svelte';
	import Masthead, { type Mode } from '#panel/lib/Masthead.svelte';
	import ProviderMark from '#panel/lib/ProviderMark.svelte';
	import Row from '#panel/lib/Row.svelte';
	import Stack from '#panel/lib/Stack.svelte';
	import Switch from '#panel/lib/Switch.svelte';
	import Zone from '#panel/lib/Zone.svelte';
	import { contextLabel, describe } from '#panel/lib/model.ts';
	import ModelView from '#panel/views/ModelView.svelte';
	import { focus } from '#panel/focus.svelte.ts';
	import { nav, type ViewId } from '#panel/nav.svelte.ts';
	import * as store from '#panel/state.svelte.ts';
	import type { Health, Inference, Remote } from '#panel/state.svelte.ts';

	// the panel's stores, its views read them
	const health = $derived(store.health.value);
	const inference = $derived(store.inference.value);
	const remote = $derived(store.remote.value);
	let open = $state(false);
	// null without systemd-inhibit
	let awake = $state<boolean | null>(null);
	let login = $state(false);
	// pending requests
	let request = $state<'on' | 'off' | null>(null);
	let wanted = $state<boolean | null>(null);
	let copied = $state(false);
	let sawStarting = false;

	const up = $derived(health.state === 'up');
	const power = $derived(inference.power);
	const on = $derived(power === 'on');
	const busy = $derived(request !== null || power === 'starting');
	const mode = $derived<Mode>(
		health.state === 'down'
			? 'down'
			: health.state === 'starting'
				? 'connecting'
				: power === 'starting'
					? 'starting'
					: on
						? 'running'
						: 'idle'
	);
	const note = $derived(
		health.state === 'up' ? health.version : health.state === 'down' ? health.reason : 'Connecting'
	);
	const model = $derived(inference.model ? describe(inference.model) : null);
	const modelSub = $derived(
		[
			inference.llama?.contextLength && `${contextLabel(inference.llama.contextLength)} context`,
			model?.format
		]
			.filter(Boolean)
			.join(' · ')
	);
	const sharing = $derived(remote.state === 'sharing' ? remote : null);
	const short = (text: string) =>
		text.length > 30 ? `${text.slice(0, 20)}…${text.slice(-8)}` : text;

	$effect(() => {
		const stops = [
			listen<Health>('daemon://health', (e) => (store.health.value = e.payload)),
			listen<Inference>('inference://state', (e) => {
				store.inference.value = e.payload;
				// sync the page's model state
				void tiles.ping();
			}),
			listen<Remote>('remote://state', (e) => (store.remote.value = e.payload))
		];
		void load();
		return () => stops.forEach((stop) => void stop.then((unlisten) => unlisten()));
	});

	// drop the row highlight between views
	$effect(() => {
		void nav.top;
		focus.reset();
	});

	async function load() {
		store.health.value = await invoke<Health>('daemon_health');
		store.inference.value = await invoke<Inference>('inference_state');
		store.remote.value = await invoke<Remote>('remote_state');
		const state = await invoke<{ awake: boolean | null; login: boolean }>('controls');
		awake = state.awake;
		login = state.login;
	}

	// clear the request once the model settles
	$effect(() => {
		if (request === null) return;
		if (!up) request = null;
		else if (power === 'starting') sawStarting = true;
		else if (power === request || (sawStarting && power !== 'unknown')) request = null;
	});

	$effect(() => {
		if (wanted !== null && remote.state !== 'unknown' && (sharing !== null) === wanted)
			wanted = null;
	});

	async function toggle() {
		if (!up) return;
		const next = (request ?? (on ? 'on' : 'off')) === 'on' ? 'off' : 'on';
		request = next;
		sawStarting = false;
		try {
			await invoke('inference_set', { on: next === 'on' });
		} catch {
			request = null;
		}
	}

	async function share() {
		if (wanted !== null || (!on && sharing === null)) return;
		wanted = sharing === null;
		try {
			await invoke('remote_set', { on: wanted });
		} catch {
			wanted = null;
		}
	}

	async function copy(ticket: string) {
		await navigator.clipboard.writeText(ticket);
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}

	// a fresh panel each time, back on its first view
	function toggled(e: ToggleEvent) {
		open = e.newState === 'open';
		if (open) void load();
		else nav.stack = ['root'];
	}
</script>

<!-- lit while the model runs -->
<button
	class="glyph tile row-tile"
	class:live={on}
	popovertarget="controls"
	aria-label="Tiles on this computer"
	title="Tiles on this computer"
>
	<span class="mark">{@html glyph}</span>
</button>

<div id="controls" class="tile" popover onbeforetoggle={toggled}>
	{#if open}
		<div class="mac">
			<Stack>
				{#snippet view(id: ViewId)}
					{#if id === 'model'}
						<ModelView />
					{:else}
						{@render root()}
					{/if}
				{/snippet}
			</Stack>
		</div>
	{/if}
</div>

{#snippet root()}
	<Masthead {mode} {on} pending={busy} disabled={!up} ontoggle={toggle} />

	<Zone label="Model" dimmed={!on}>
		{#if model}
			<Row
				size="large"
				title={model.name}
				sub={modelSub}
				submono
				dimmed={!on}
				onselect={() => nav.push('model')}
			>
				{#snippet leading()}
					<ProviderMark provider={model.provider} />
				{/snippet}
				{#snippet trailing()}
					{#if model.quant}<Chip text={model.quant} />{/if}
					<Chevron />
				{/snippet}
			</Row>
		{:else}
			<Row size="large" title="No model picked" sub="Pick one in Models" dimmed>
				{#snippet leading()}
					<ProviderMark provider="generic" />
				{/snippet}
			</Row>
		{/if}
	</Zone>

	<Zone label="Share your compute" dimmed={!on}>
		<Row title="Remote inference" dimmed={!on || remote.state === 'unknown'}>
			{#snippet trailing()}
				<Switch
					on={on && (wanted ?? sharing !== null)}
					disabled={!on}
					size="small"
					glow={false}
					label="Remote inference"
					onchange={share}
				/>
			{/snippet}
		</Row>
		{#if on && sharing}
			<Row key="Ticket" mono title={short(sharing.ticket)} onselect={() => copy(sharing.ticket)}>
				{#snippet inline()}
					<CopyMark {copied} />
				{/snippet}
			</Row>
		{:else if on && wanted}
			<Row key="Ticket">
				{#snippet inline()}
					<span class="skeleton" aria-label="Getting a ticket"></span>
				{/snippet}
			</Row>
		{/if}
	</Zone>

	<Zone label="This computer">
		<Row title="Start at login">
			{#snippet trailing()}
				<Switch
					on={login}
					size="small"
					glow={false}
					label="Start at login"
					onchange={async () => (login = await invoke<boolean>('start_at_login', { on: !login }))}
				/>
			{/snippet}
		</Row>
	</Zone>

	<footer>
		<span class="note" class:alert={health.state === 'down'}>{note}</span>
		{#if awake !== null}
			<button
				class="plate-cut"
				class:held={awake}
				aria-pressed={awake}
				title="Keep this computer awake"
				onclick={async () => (awake = await invoke<boolean>('keep_awake', { on: !awake }))}
			>
				<CupMark active={awake} />
				Keep awake
			</button>
		{/if}
		<button class="plate-cut quit" onclick={() => invoke('quit_app')}>Quit</button>
	</footer>
{/snippet}

<style>
	/* the title bar turns pointer events off */
	.glyph,
	[popover] {
		pointer-events: auto;
	}

	.glyph {
		width: 34px;
		height: 26px;
		display: grid;
		place-items: center;
		color: var(--slate);
	}

	.glyph.live {
		color: var(--bone);
	}

	.glyph:hover,
	.glyph:has(+ :popover-open) {
		color: var(--bone);
		background-color: var(--steel);
	}

	/* the menu bar's glyph */
	.mark {
		display: block;
		width: 14px;
		height: 13px;
	}

	.mark :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	/* Mac panel's sizes */
	[popover] {
		--pad-x: 14px;
		--rail-w: 2px;
		--h-row: 26px;
		--h-row-lg: 38px;
		--h-masthead: 36px;
		--h-nav: 36px;
		--cut: 4px;
		--clip-cut: polygon(
			0 0,
			100% 0,
			100% calc(100% - var(--cut)),
			calc(100% - var(--cut)) 100%,
			0 100%
		);

		inset: calc(var(--titlebar) + 4px) 8px auto auto;
		width: calc(380px / var(--zoom));
		margin: 0;
		padding: 0;
		display: none;
		overflow: hidden;
		--r: var(--radius-m);
		background-color: var(--panel);
		box-shadow: var(--shadow-float);
		font-size: var(--fs-title);
		color: var(--bone);
	}

	[popover]:popover-open {
		display: block;
	}

	/* Mac size, without the page's zoom */
	.mac {
		zoom: calc(1 / var(--zoom));
	}

	/* drop the page's chip border */
	[popover] :global(.chip) {
		border: 0;
		border-radius: 0;
	}

	/* no pointer cursor in a menu */
	[popover] :global(*) {
		cursor: default;
	}

	.skeleton {
		width: 186px;
		height: 11px;
		background: var(--slate);
		opacity: 0.5;
		animation: pulse 1.4s ease-in-out infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.75;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
		}
	}

	footer {
		position: relative;
		height: 36px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 var(--pad-x);
		border-top: var(--hairline) solid var(--rule);
	}

	.note {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--fs-body);
		color: var(--slate);
	}

	.note.alert {
		color: var(--alert);
	}

	/* Mac footer's buttons */
	.plate-cut {
		--row-mark: currentColor;
		flex: none;
		height: 22px;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 9px;
		clip-path: var(--clip-cut);
		background: var(--steel);
		color: var(--ash);
		font-size: var(--fs-body);
		line-height: 1;
		transition:
			background var(--dur-state) ease-out,
			color var(--dur-state) ease-out;
	}

	.plate-cut:hover {
		color: var(--bone);
	}

	.plate-cut.held,
	.quit:hover {
		background: var(--signal);
		color: var(--void);
	}
</style>
