<script lang="ts">
	import { page } from '$app/state';
	import Account from './Account.svelte';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';
	import { percent, size, timeLeft } from '#lib/format.ts';
	import { models } from '#lib/state/models.svelte.ts';
	import { sessions } from '#lib/state/sessions.svelte.ts';
	import { settings } from '#lib/state/settings.svelte.ts';

	let {
		searching = $bindable(false),
		onsettings
	}: { searching?: boolean; onsettings: () => void } = $props();

	let query = $state('');
	const rail = $derived(!settings.sidebarOpen);

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
		<a href="/" aria-label="New chat"><Logo /></a>
		<button
			class="icon"
			aria-label={rail ? 'Open the sidebar' : 'Close the sidebar'}
			onclick={() => (settings.sidebarOpen = !settings.sidebarOpen)}
		>
			<Icon name="sidebar" />
		</button>
	</div>

	{#if searching && !rail}
		<label class="search">
			<Icon name="search" size={14} />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={query}
				placeholder="Search chats"
				autofocus
				onkeydown={(e) => e.key === 'Escape' && (searching = false)}
			/>
		</label>
	{:else}
		<div class="actions">
			<a class="act" href="/" title="New chat">
				<Icon name="plus" size={15} /><span>New chat</span><kbd>⇧⌘O</kbd>
			</a>
			<button
				class="act"
				title="Search"
				onclick={() => ((settings.sidebarOpen = true), (searching = true))}
			>
				<Icon name="search" size={15} /><span>Search</span><kbd>⌘K</kbd>
			</button>
			<a
				class="act"
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
			<button class="act" title="Settings" onclick={onsettings}>
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
						class="chat"
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

	<div class="foot"><Account compact={rail} /></div>
</nav>

<style>
	nav {
		width: 264px;
		height: 100%;
		display: flex;
		flex-direction: column;
		border-right: var(--hairline) solid var(--rule);
		background: var(--void);
	}

	nav.rail {
		width: 52px;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 12px 8px 14px;
	}

	.rail .top {
		flex-direction: column;
		gap: 12px;
		padding: 12px 0 8px;
	}

	.icon {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border-radius: 6px;
		color: var(--slate);
	}

	.icon:hover {
		color: var(--bone);
		background: var(--steel);
	}

	.actions {
		display: grid;
		gap: 2px;
		padding: 4px 8px 10px;
	}

	.act {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 8px;
		border-radius: 7px;
		color: var(--ash);
		text-decoration: none;
	}

	.act:hover,
	.act.on {
		background: var(--steel);
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
		font-family: var(--font-mono);
		font-size: var(--fs-chip);
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
		background: var(--void);
		box-sizing: content-box;
	}

	.search {
		margin: 4px 8px 10px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 9px;
		border: var(--hairline) solid var(--signal);
		border-radius: 8px;
		background: var(--steel);
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

	.list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 4px 8px;
		display: grid;
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
		border-radius: 7px;
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
		background: var(--steel);
		color: var(--bone);
	}

	.foot {
		margin-top: auto;
		padding: 10px 12px;
		border-top: var(--hairline) solid var(--rule);
	}

	.rail .foot {
		padding: 10px 7px;
	}
</style>
