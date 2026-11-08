<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import Icon from './Icon.svelte';
	import { desktop, type WindowButton } from '#lib/desktop.ts';
	import { dragsWindow } from '#lib/drag.ts';
	import { settings } from '#lib/state/settings.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';

	type Edge = Parameters<ReturnType<typeof getCurrentWindow>['startResizeDragging']>[0];

	const { left, right } = desktop()!.titlebar!;
	const win = getCurrentWindow();
	let maximized = $state(false);

	$effect(() => {
		const check = async () => (maximized = await win.isMaximized());
		void check();
		const stop = win.onResized(check);
		return () => void stop.then((unlisten) => unlisten());
	});

	// the sidebar's own top row sits in the bar, the bar starts after it
	const side = $derived(tiles.phase === 'ready' ? (settings.sidebarOpen ? 264 : 52) : 0);

	const labels: Record<WindowButton, string> = {
		minimize: 'Minimize',
		maximize: 'Maximize',
		close: 'Close'
	};

	// an undecorated window has no borders of its own to resize by
	const edges: Edge[] = [
		'North',
		'South',
		'West',
		'East',
		'NorthWest',
		'NorthEast',
		'SouthWest',
		'SouthEast'
	];

	function press(button: WindowButton) {
		if (button === 'minimize') void win.minimize();
		else if (button === 'maximize') void win.toggleMaximize();
		else void win.close();
	}
</script>

{#snippet buttons(names: WindowButton[])}
	{#each names as name (name)}
		<button
			class="tile row-tile"
			class:close={name === 'close'}
			aria-label={name === 'maximize' && maximized ? 'Restore' : labels[name]}
			onclick={() => press(name)}
		>
			<Icon
				name={name === 'close' ? 'x' : name === 'maximize' && maximized ? 'restore' : name}
				size={14}
			/>
		</button>
	{/each}
{/snippet}

<header style:--side="{side}px">
	<div class="lead"></div>
	{@render buttons(left)}
	<div class="grip" use:dragsWindow></div>
	{@render buttons(right)}
</header>

{#if !maximized}
	{#each edges as edge (edge)}
		<div
			class="edge {edge.toLowerCase()}"
			aria-hidden="true"
			onpointerdown={(e) => e.button === 0 && void win.startResizeDragging(edge)}
		></div>
	{/each}
{/if}

<style>
	/* over the page, which keeps its top clear with --titlebar */
	header {
		position: absolute;
		inset: 0 0 auto;
		z-index: 30;
		height: var(--titlebar);
		display: flex;
		align-items: center;
		gap: 2px;
		padding-right: 6px;
		pointer-events: none;
		user-select: none;
	}

	.lead {
		width: var(--side);
		flex: none;
	}

	.grip {
		flex: 1;
		align-self: stretch;
	}

	.grip,
	button {
		pointer-events: auto;
	}

	button {
		width: 34px;
		height: 26px;
		display: grid;
		place-items: center;
		color: var(--slate);
	}

	button:hover {
		color: var(--bone);
		background-color: var(--steel);
	}

	button.close:hover {
		color: var(--alert);
		background-color: color-mix(in srgb, var(--alert) 14%, transparent);
	}

	.edge {
		position: fixed;
		z-index: 100;
	}

	.north,
	.south {
		left: 8px;
		right: 8px;
		height: 4px;
		cursor: ns-resize;
	}

	.north {
		top: 0;
	}

	.south {
		bottom: 0;
	}

	.west,
	.east {
		top: 8px;
		bottom: 8px;
		width: 4px;
		cursor: ew-resize;
	}

	.west {
		left: 0;
	}

	.east {
		right: 0;
	}

	.northwest,
	.northeast,
	.southwest,
	.southeast {
		width: 8px;
		height: 8px;
	}

	.northwest {
		top: 0;
		left: 0;
		cursor: nwse-resize;
	}

	.northeast {
		top: 0;
		right: 0;
		cursor: nesw-resize;
	}

	.southwest {
		bottom: 0;
		left: 0;
		cursor: nesw-resize;
	}

	.southeast {
		bottom: 0;
		right: 0;
		cursor: nwse-resize;
	}
</style>
