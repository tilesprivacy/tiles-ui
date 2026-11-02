<script lang="ts">
	import EngineSettings from './EngineSettings.svelte';
	import { defaultSettings, settings, type Settings } from '#lib/state/settings.svelte.ts';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let dialog: HTMLDialogElement;
	const tabs = ['General', 'Display', 'Engine', 'About'] as const;
	let tab = $state<(typeof tabs)[number]>('General');

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	const rows: Record<string, [keyof Settings, string, string][]> = {
		General: [
			['sendOnEnter', 'Send with Enter', 'Shift+Enter adds a new line. Off swaps them'],
			['followReply', 'Follow the reply while it streams', 'Scrolling up stops following']
		],
		Display: [
			[
				'openReasoning',
				'Open reasoning while it streams',
				'Otherwise it stays folded until you click it'
			],
			['toolDetails', 'Always show tool details', 'Otherwise a tool call opens on a click'],
			['userMarkdown', 'Format your messages', 'Render your messages as markdown'],
			['fullCode', 'Full-height code blocks', 'Otherwise long code scrolls inside its block'],
			['sidebarOpen', 'Keep the sidebar open', 'Closed, it becomes a slim rail']
		]
	};
</script>

<dialog class="tile" bind:this={dialog} onclose={() => (open = false)} aria-label="Settings">
	<nav>
		<h2>Settings</h2>
		{#each tabs as name (name)}
			<button class="tile row-tile" class:on={tab === name} onclick={() => (tab = name)}
				>{name}</button
			>
		{/each}
	</nav>

	<div class="body">
		<h3>{tab}</h3>
		{#if tab === 'Engine'}
			<EngineSettings />
		{:else if tab === 'About'}
			<p>Tiles UI {__UI_VERSION__}</p>
			<p><a href="https://tiles.run/book" target="_blank" rel="noreferrer">Read the docs</a></p>
			<p>
				<a href="https://github.com/tilesprivacy/tiles/issues" target="_blank" rel="noreferrer">
					Report an issue
				</a>
			</p>
		{:else}
			{#each rows[tab] as [key, label, hint] (key)}
				<label class="row">
					<span>{label}<small class="muted">{hint}</small></span>
					<input type="checkbox" role="switch" bind:checked={settings[key]} />
				</label>
			{/each}
		{/if}
	</div>

	<footer>
		{#if tab === 'General' || tab === 'Display'}
			<button class="plate ghost" onclick={() => Object.assign(settings, defaultSettings)}
				>Reset</button
			>
		{/if}
		<button class="plate" onclick={() => (open = false)}>Done</button>
	</footer>
</dialog>

<style>
	dialog {
		width: min(860px, calc(100vw - 32px));
		height: min(600px, calc(100dvh - 32px));
		margin: auto;
		padding: 0;
		--c: var(--cut-l);
		background-color: var(--panel);
		color: var(--bone);
	}

	dialog[open] {
		display: grid;
		grid-template: 1fr auto / 190px 1fr;
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.55);
	}

	nav {
		grid-row: 1 / 3;
		display: grid;
		align-content: start;
		gap: 2px;
		padding: 16px 10px;
		border-right: var(--hairline) solid var(--rule);
	}

	h2 {
		padding: 0 10px 12px;
		font-size: 15px;
		font-weight: 600;
	}

	nav button {
		padding: 7px 10px;
		color: var(--ash);
		text-align: left;
	}

	nav button.on,
	nav button:hover {
		background-color: var(--steel);
		color: var(--bone);
	}

	nav button.on {
		box-shadow: inset 2px 0 var(--signal);
	}

	.body {
		padding: 22px 26px;
		overflow-y: auto;
		display: grid;
		align-content: start;
		gap: 4px;
	}

	h3 {
		padding-bottom: 8px;
		font-size: var(--fs-title);
		font-weight: 600;
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 11px 0;
		border-bottom: var(--hairline) solid var(--rule);
		cursor: pointer;
	}

	small {
		display: block;
		font-size: var(--fs-body);
	}

	.body p {
		padding: 6px 0;
		color: var(--ash);
	}

	footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 20px;
		border-top: var(--hairline) solid var(--rule);
	}

	@media (max-width: 700px) {
		dialog[open] {
			grid-template: auto 1fr auto / 1fr;
		}

		nav {
			grid-row: auto;
			display: flex;
			flex-wrap: wrap;
			border-right: 0;
			border-bottom: var(--hairline) solid var(--rule);
		}

		h2 {
			width: 100%;
		}
	}
</style>
