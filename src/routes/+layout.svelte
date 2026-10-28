<script lang="ts">
	import '#lib/styles/base.css';
	import { afterNavigate, goto } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';
	import Onboarding from '#lib/components/Onboarding.svelte';
	import Settings from '#lib/components/Settings.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import Splash from '#lib/components/Splash.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { models } from '#lib/state/models.svelte.ts';
	import { sessions } from '#lib/state/sessions.svelte.ts';
	import { settings } from '#lib/state/settings.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let searching = $state(false);
	let settingsOpen = $state(false);
	let menuOpen = $state(false);

	tiles.boot();

	$effect(() => {
		if (tiles.phase !== 'ready') return;
		sessions.load();
		models.load();
		models.watch();
		// keeps the model chip and the reconnect bar current
		const timer = setInterval(async () => {
			const wasOffline = tiles.offline;
			await tiles.ping();
			if (wasOffline && !tiles.offline) sessions.load();
		}, 4000);
		return () => clearInterval(timer);
	});

	// the menu bar app asks the page to route itself rather than reload
	$effect(() => {
		const open = (e: Event) => {
			const path = (e as CustomEvent<string>).detail;
			if (typeof path !== 'string' || !path.startsWith('/')) return;
			e.preventDefault();
			goto(path);
		};
		window.addEventListener('tiles:open', open);
		return () => window.removeEventListener('tiles:open', open);
	});

	afterNavigate(() => (menuOpen = false));

	function shortcut(e: KeyboardEvent) {
		if (!(e.metaKey || e.ctrlKey) || tiles.phase !== 'ready') return;
		const key = e.key.toLowerCase();
		if (key === 'k') searching = !searching;
		else if (key === 'b') settings.sidebarOpen = !settings.sidebarOpen;
		else if (key === 'o' && e.shiftKey) goto('/');
		else return;
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={shortcut} />

{#if tiles.phase === 'ready'}
	<div class="shell" class:menu={menuOpen}>
		{#if tiles.offline}
			<p class="offline" role="alert"><span class="spin"></span>Tiles stopped. Reconnecting…</p>
		{/if}
		<Sidebar bind:searching onsettings={() => (settingsOpen = true)} />
		<button class="scrim" aria-label="Close the menu" onclick={() => (menuOpen = false)}></button>
		<main>
			<button class="menu-button" aria-label="Open the menu" onclick={() => (menuOpen = true)}>
				<Icon name="sidebar" />
			</button>
			{@render children()}
		</main>
	</div>
	<Settings bind:open={settingsOpen} />
{:else if tiles.phase === 'welcome'}
	<Onboarding />
{:else}
	<Splash />
{/if}

<Toasts />

<style>
	.shell {
		height: 100%;
		display: grid;
		grid-template-columns: auto 1fr;
	}

	main {
		position: relative;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.offline {
		position: fixed;
		inset: 0 0 auto;
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 14px;
		border-bottom: var(--hairline) solid color-mix(in srgb, var(--alert) 35%, transparent);
		background: color-mix(in srgb, var(--alert) 12%, var(--void));
		font-size: var(--fs-body);
	}

	.offline .spin {
		border-top-color: var(--alert);
	}

	.scrim,
	.menu-button {
		display: none;
	}

	/* px, not rem: WebKitGTK scales rem with the desktop's text size */
	@media (max-width: 767px) {
		.shell {
			grid-template-columns: 1fr;
		}

		.shell > :global(nav) {
			position: fixed;
			inset: 0 auto 0 0;
			z-index: 30;
			width: min(288px, 85vw);
			translate: -100% 0;
			transition: translate var(--dur-push) var(--ease-push);
		}

		.menu > :global(nav) {
			translate: 0 0;
		}

		.menu .scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 20;
			background: rgb(0 0 0 / 0.5);
			backdrop-filter: blur(2px);
		}

		.menu-button {
			display: grid;
			place-items: center;
			position: absolute;
			top: 10px;
			left: 10px;
			z-index: 5;
			width: 32px;
			height: 32px;
			border-radius: 8px;
			color: var(--slate);
		}
	}
</style>
