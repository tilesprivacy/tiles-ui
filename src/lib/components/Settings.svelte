<script lang="ts">
	import EngineSettings from './EngineSettings.svelte';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';
	import { desktop } from '#lib/desktop.ts';
	import { defaultSettings, settings, type Settings } from '#lib/state/settings.svelte.ts';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let dialog: HTMLDialogElement;
	const tabs = ['General', 'Display', 'Engine', 'About'] as const;
	let tab = $state<(typeof tabs)[number]>('General');
	let version = $state('');

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	// Tiles' own version. only the app reaches the daemon route that tells it
	$effect(() => {
		const daemon = desktop()?.daemon;
		if (tab !== 'About' || version || !daemon) return;
		fetch(`${daemon}/`)
			.then((res) => (res.ok ? res.text() : ''))
			.then((text) => (version = /^\d+\.\d+\.\d+\S*$/.test(text.trim()) ? text.trim() : ''))
			.catch(() => {});
	});

	const links = [
		['Read the docs', 'tiles.run/book', 'https://tiles.run/book'],
		[
			'Report an issue',
			'github.com/tilesprivacy/tiles',
			'https://github.com/tilesprivacy/tiles/issues'
		]
	];

	const rows: Record<string, [keyof Settings, string, string][]> = {
		General: [
			[
				'sendOnEnter',
				'Send with Enter',
				'Press Enter to send and Shift+Enter for a new line. Turn off to swap these shortcuts.'
			],
			[
				'followReply',
				'Follow replies',
				'Scroll automatically as replies appear. Scroll up to stop.'
			]
		],
		Display: [
			[
				'openReasoning',
				'Expand reasoning automatically',
				'Show reasoning as it appears. Turn off to expand it manually.'
			],
			[
				'toolDetails',
				'Expand tool details automatically',
				'Show tool details in full. Turn off to expand them manually.'
			],
			[
				'userMarkdown',
				'Format your messages',
				'Show headings, lists, and other Markdown formatting in your messages.'
			],
			[
				'fullCode',
				'Expand code blocks',
				'Show code blocks at full height. Turn off to scroll within long blocks.'
			],
			[
				'sidebarOpen',
				'Keep the sidebar open',
				'Turn off to collapse the sidebar into a narrow bar.'
			]
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
			<div class="app">
				<Logo size={40} />
				<span
					><b>Tiles</b>{#if version}<small class="muted">Version {version}</small>{/if}</span
				>
			</div>
			{#each links as [label, where, href] (href)}
				<a class="link tile" {href} target="_blank" rel="noreferrer">
					<span>{label}<small class="muted">{where}</small></span>
					<Icon name="open" size={14} />
				</a>
			{/each}
			<p class="legal">© 2026 Tiles Privacy Technologies Pvt. Ltd.</p>
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
				>Reset to defaults</button
			>
		{/if}
		<button class="plate" onclick={() => (open = false)}>Done</button>
	</footer>
</dialog>

<style>
	/* centred under the title bar, clear of the traffic lights */
	dialog {
		top: var(--titlebar, 0px);
		width: min(860px, calc(100vw - 32px));
		height: min(600px, calc(100% - var(--titlebar, 0px) - 32px));
		margin: auto;
		padding: 0;
		--r: var(--radius-l);
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

	.app {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 4px 0 16px;
	}

	.app b {
		font-size: 15px;
		font-weight: 600;
	}

	.link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 4px;
		padding: 10px 12px;
		color: var(--bone);
		text-decoration: none;
	}

	.link:hover {
		--line: var(--edge);
		background-color: var(--steel);
	}

	.link :global(svg) {
		flex: none;
		color: var(--slate);
	}

	.legal {
		padding-top: 14px;
		font-size: var(--fs-label);
		color: var(--slate);
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
