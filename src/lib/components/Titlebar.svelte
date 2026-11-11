<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import Controls from './Controls.svelte';
	import Icon from './Icon.svelte';
	import { desktop, type WindowButton } from '#lib/desktop.ts';
	import { dragsWindow } from '#lib/drag.ts';
	import { settings } from '#lib/state/settings.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';

	type Edge = Parameters<ReturnType<typeof getCurrentWindow>['startResizeDragging']>[0];

	const { left, right, lights = 0 } = desktop()!.titlebar!;
	const mac = lights > 0;
	const win = getCurrentWindow();
	let maximized = $state(false);
	let fullscreen = $state(false);

	$effect(() => {
		const check = async () => {
			maximized = await win.isMaximized();
			// no traffic lights in full screen
			if (mac) fullscreen = await win.isFullscreen();
		};
		void check();
		const stop = win.onResized(check);
		return () => void stop.then((unlisten) => unlisten());
	});

	const ready = $derived(tiles.phase === 'ready');
	// over the sidebar the bar holds its toggle with back and forward
	const side = $derived(ready ? (settings.sidebarOpen ? 'var(--sidebar)' : 'var(--rail)') : '0px');

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

<header class:frame={ready} style:--side={side} style:--lights="{fullscreen ? 0 : lights}px">
	<div class="lead" use:dragsWindow>
		{#if ready}
			<button
				class="tile row-tile"
				aria-label={settings.sidebarOpen ? 'Close the sidebar' : 'Open the sidebar'}
				title={settings.sidebarOpen ? 'Close the sidebar' : 'Open the sidebar'}
				onclick={() => (settings.sidebarOpen = !settings.sidebarOpen)}
			>
				<Icon name="sidebar" size={15} />
			</button>
			<button class="tile row-tile" aria-label="Back" title="Back" onclick={() => history.back()}>
				<Icon name="back" size={15} />
			</button>
			<button
				class="tile row-tile"
				aria-label="Forward"
				title="Forward"
				onclick={() => history.forward()}
			>
				<Icon name="forward" size={15} />
			</button>
		{/if}
	</div>
	{@render buttons(left)}
	<div class="grip" use:dragsWindow></div>
	<!-- Linux only -->
	{#if !mac}
		<Controls />
		{#if right.length}<span class="rule"></span>{/if}
	{/if}
	{@render buttons(right)}
</header>

{#if !maximized && !mac}
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

	/* one surface with the sidebar, the page sits in the corner the two make */
	.frame {
		--corner: var(--radius-m);
		background: var(--panel);
	}

	/* the line under the bar, from where the corner ends */
	.frame::after {
		content: '';
		position: absolute;
		inset: auto 0 0 calc(var(--side) + var(--corner) - var(--hairline));
		height: var(--hairline);
		background: var(--rule);
	}

	/* the page's rounded corner: the page inside the curve, the line along it, the panel outside */
	.frame::before {
		content: '';
		position: absolute;
		top: calc(100% - var(--hairline));
		left: calc(var(--side) - var(--hairline));
		width: var(--corner);
		height: var(--corner);
		background:
			radial-gradient(
				circle at 100% 100%,
				transparent calc(var(--corner) - var(--hairline) - 0.5px),
				var(--rule) calc(var(--corner) - var(--hairline)) calc(var(--corner) - 0.5px),
				transparent var(--corner)
			),
			radial-gradient(
				circle at 100% 100%,
				var(--void) calc(var(--corner) - var(--hairline)),
				var(--panel) calc(var(--corner) - var(--hairline) + 0.5px)
			);
	}

	/* the toggle sits over the sidebar's column of icons, a rail lets the row run past it.
	   on a Mac it starts after the traffic lights */
	.lead {
		width: var(--side);
		min-width: fit-content;
		flex: none;
		align-self: stretch;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 0 8px 0 max(10px, calc(var(--lights) / var(--zoom)));
	}

	.lead:empty {
		padding: 0;
	}

	.grip {
		flex: 1;
		align-self: stretch;
	}

	.rule {
		width: var(--hairline);
		height: 16px;
		margin: 0 4px;
		background: var(--rule);
	}

	.lead,
	.grip,
	button {
		pointer-events: auto;
	}

	.lead button {
		width: 28px;
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
