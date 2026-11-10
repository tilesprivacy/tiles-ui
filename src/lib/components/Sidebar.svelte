<script lang="ts">
	import { page } from '$app/state';
	import Account from './Account.svelte';
	import Devices from './Devices.svelte';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';
	import { desktop } from '#lib/desktop.ts';
	import { keys, percent, size, timeLeft } from '#lib/format.ts';
	import { models } from '#lib/state/models.svelte.ts';
	import { sessions } from '#lib/state/sessions.svelte.ts';
	import { settings } from '#lib/state/settings.svelte.ts';

	let {
		searching = $bindable(false),
		onsettings
	}: { searching?: boolean; onsettings: () => void } = $props();

	let query = $state('');
	const rail = $derived(!settings.sidebarOpen);
	const chrome = !!desktop()?.titlebar;

	const active = $derived(models.active);
	const progress = $derived(
		active && 'done' in active.download ? percent(active.download.done, active.download.total) : 0
	);
	const tip = $derived.by(() => {
		const d = active?.download;
		if (!d || !('done' in d)) return '';
		const rate = d.state === 'downloading' ? d.bytes_per_sec : 0;
		return `Downloading ${active!.label} · ${size(d.done)} of ${size(d.total)} ${timeLeft(d.done, d.total, rate)}`;
	});

	$effect(() => {
		if (!searching) query = '';
	});
</script>

<nav class:rail aria-label="Tiles">
	<div class="top">
		<a class="brand" href="/" aria-label="New chat">
			<Logo size={26} />
			{#if !rail}
				<span class="name">Tiles</span>
				<span class="stage">Alpha</span>
			{/if}
		</a>
		{#if !rail}
			<div class="tools">
				<button
					class="icon tile row-tile"
					aria-pressed={searching}
					aria-label="Search chats"
					title="Search chats  {keys('K')}"
					onclick={() => (searching = !searching)}
				>
					<Icon name="search" />
				</button>
				<!-- the app's own title bar on Linux holds it, with back and forward -->
				{#if !chrome}
					<button
						class="icon tile row-tile"
						aria-label="Close the sidebar"
						onclick={() => (settings.sidebarOpen = false)}
					>
						<Icon name="sidebar" />
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if searching && !rail}
		<label class="search tile">
			<Icon name="search" size={14} />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={query}
				placeholder="Search chats"
				spellcheck="false"
				autocorrect="off"
				autocapitalize="off"
				autofocus
			/>
			<button
				type="button"
				class="close tile row-tile"
				aria-label="Close search"
				title="Close search"
				onclick={() => (searching = false)}
			>
				<Icon name="x" size={13} />
			</button>
		</label>
	{:else}
		<div class="actions">
			<!-- a rail opens again from its first tile, the app's title bar has a button of its own -->
			{#if rail && !chrome}
				<button
					class="act tile row-tile"
					title="Open the sidebar"
					onclick={() => (settings.sidebarOpen = true)}
				>
					<Icon name="sidebar" size={15} /><span>Open the sidebar</span>
				</button>
			{/if}
			<a class="act tile row-tile" href="/" title="New chat">
				<Icon name="plus" size={15} /><span>New chat</span><kbd>{keys('O', true)}</kbd>
			</a>
			<!-- an open sidebar has search beside the name -->
			{#if rail}
				<button
					class="act tile row-tile"
					title="Search"
					onclick={() => ((settings.sidebarOpen = true), (searching = true))}
				>
					<Icon name="search" size={15} /><span>Search</span><kbd>{keys('K')}</kbd>
				</button>
			{/if}
			<a
				class="act tile row-tile"
				class:on={page.url.pathname === '/models'}
				href="/models"
				title={tip || 'Models'}
			>
				{#if active}
					<span class="ring" style:--p="{progress}%"><Icon name="chip" size={11} /></span>
					<span>Models</span><kbd>{progress}%</kbd>
				{:else}
					<Icon name="chip" size={15} /><span>Models</span>
				{/if}
			</a>
			<button class="act tile row-tile" title="Settings" onclick={onsettings}>
				<Icon name="sliders" size={15} /><span>Settings</span>
			</button>
		</div>
	{/if}

	{#if !rail}
		<div class="list">
			{#if sessions.reason}
				<p class="muted">Couldn't load your chats.</p>
				<button class="plate" onclick={() => sessions.load()}>Try again</button>
			{:else if !sessions.list.length}
				<p class="muted">No chats yet</p>
			{/if}
			{#each sessions.grouped(query) as [name, list] (name)}
				<h3>{name}</h3>
				{#each list as session (session.id)}
					<a
						class="chat tile row-tile"
						class:on={page.params.id === session.id}
						href="/chat/{session.id}"
						title={session.name}
					>
						<span>{session.name}</span>
						{#if sessions.busy.has(session.id)}<span class="spin"></span>{/if}
					</a>
				{/each}
			{:else}
				{#if query}<p class="muted">No chats match</p>{/if}
			{/each}
		</div>
	{/if}

	{#if !rail}<Devices />{/if}

	<div class="foot"><Account compact={rail} /></div>
</nav>

<style>
	nav {
		width: var(--sidebar);
		height: 100%;
		display: flex;
		flex-direction: column;
		/* below the app's own title bar on Linux */
		padding-top: var(--titlebar, 0);
		border-right: var(--hairline) solid var(--rule);
		background: var(--panel);
	}

	nav.rail {
		width: var(--rail);
	}

	/* the mark sits on the line the rows' icons are on, open or closed, by its weight:
	   it leans, and that is left of the middle of its outline. the tools end where
	   the rows' shortcuts do */
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 10px 8px 12px;
	}

	/* the name starts where the rows' labels do */
	.brand {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--bone);
		text-decoration: none;
	}

	/* capitals at six tenths of the drawn mark, centred on it */
	.name {
		position: relative;
		top: var(--brand-drop);
		font-size: var(--fs-brand);
		font-weight: 600;
		line-height: 1;
		letter-spacing: 0.01em;
	}

	.stage {
		margin-left: 4px;
		/* centred on the letters, less the tracking after the last one */
		padding: 1.5px calc(4.5px - 0.04em) 1.5px 4.5px;
		border: var(--hairline) solid var(--edge);
		border-radius: 999px;
		box-shadow: var(--shadow-raised);
		font-size: var(--fs-badge);
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--slate);
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	/* halfway between the title bar's buttons and the first row, by the mark's weight */
	:global(.chrome) .top {
		padding-block: 8.5px 1.5px;
	}

	.icon {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		color: var(--slate);
	}

	.icon[aria-pressed='true'] {
		color: var(--bone);
		background-color: var(--steel);
	}

	.icon:hover {
		color: var(--bone);
		background-color: var(--steel);
	}

	.actions {
		display: grid;
		gap: 2px;
		padding: 4px 8px 10px;
	}

	/* as tall with its label as without, a rail's tiles stay where the rows were */
	.act {
		min-height: 32px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 8px;
		color: var(--ash);
		text-decoration: none;
	}

	.act:hover,
	.act.on {
		background-color: var(--steel);
		color: var(--bone);
	}

	.act > :global(svg) {
		color: var(--slate);
	}

	.rail .act {
		justify-content: center;
	}

	.rail .act :is(span:not(.ring), kbd) {
		display: none;
	}

	kbd {
		margin-left: auto;
		font-family: var(--font-ui);
		font-size: var(--fs-label);
		color: var(--slate);
	}

	.ring {
		width: 17px;
		height: 17px;
		margin: -1px;
		flex: none;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: conic-gradient(var(--signal) var(--p), var(--rule) 0);
		color: var(--slate);
	}

	.ring :global(svg) {
		padding: 1px;
		border-radius: 50%;
		background: var(--panel);
		box-sizing: content-box;
	}

	.search {
		margin: 4px 8px 10px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 9px;
		--line: var(--edge);
		background-color: var(--steel);
		color: var(--slate);
	}

	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		outline: none;
		color: var(--bone);
	}

	.close {
		width: 18px;
		height: 18px;
		flex: none;
		display: grid;
		place-items: center;
		margin-right: -3px;
		color: var(--slate);
	}

	.close:hover {
		background-color: var(--lift);
		color: var(--bone);
	}

	.list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 4px 8px;
		display: grid;
		/* without the 0, a long title widens the sidebar instead of cutting off */
		grid-template-columns: minmax(0, 1fr);
		align-content: start;
		gap: 1px;
	}

	.list p {
		padding: 6px 8px;
		font-size: var(--fs-body);
	}

	h3 {
		padding: 10px 8px 4px;
		font-size: var(--fs-label);
		font-weight: 400;
		color: var(--slate);
	}

	.chat {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		color: var(--ash);
		text-decoration: none;
	}

	.chat span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chat .spin {
		margin-left: auto;
	}

	.chat:hover,
	.chat.on {
		background-color: var(--steel);
		color: var(--bone);
	}

	.foot {
		margin-top: auto;
		padding: 10px 12px;
		border-top: var(--hairline) solid var(--rule);
	}

	.rail .foot {
		padding: 10px 8px;
	}
</style>
