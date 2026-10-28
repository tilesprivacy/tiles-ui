<script lang="ts">
	import Icon from './Icon.svelte';
	import { toasts } from '#lib/state/toasts.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';

	let { compact = false }: { compact?: boolean } = $props();

	let handle = $state('');
	let error = $state('');
	let signIn: AbortController | null = $state(null);

	const account = $derived(tiles.account);
	const initial = $derived(account?.nickname.charAt(0).toUpperCase() ?? '?');
	const short = (did: string) => (did.length > 24 ? `${did.slice(0, 14)}…${did.slice(-6)}` : did);

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		toasts.show('Copied');
	}

	async function connect() {
		const tab = window.open('', '_blank');
		signIn = new AbortController();
		error = '';
		try {
			await tiles.signIn(handle, tab, signIn.signal);
			if (tiles.atproto) toasts.show(`Signed in as ${tiles.atproto.handle}`);
		} catch (err) {
			error = (err as Error).message;
		}
		if (!tiles.atproto) tab?.close();
		signIn = null;
	}

	async function signOut() {
		try {
			await tiles.signOut();
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}
</script>

{#if account}
	<button class="badge" popovertarget="account" aria-label="Your accounts">
		<span class="avatar" class:live={tiles.atproto}>{initial}</span>
		{#if !compact}
			<span class="who">
				<span>{account.nickname}</span>
				<span class="mono muted">{short(account.id)}</span>
			</span>
		{/if}
	</button>

	<div id="account" popover>
		<section>
			<h2>Tiles Account</h2>
			<div class="row">
				<span class="plate initial">{initial}</span>
				<b>{account.nickname}</b>
			</div>
			<button class="did" onclick={() => copy(account.id)} aria-label="Copy your DID">
				<span>{account.id}</span>
				<Icon name="copy" size={13} />
			</button>
			<p class="muted">
				Your account lives on this device. Its DID is how other devices and apps know it's you.
			</p>
		</section>

		<section>
			<h2>Atmosphere Account</h2>
			{#if tiles.atproto}
				<div class="row">
					<span class="mono">@{tiles.atproto.handle}</span>
					<button class="plate ghost" onclick={signOut}>Sign out</button>
				</div>
				<p class="mono muted">{short(tiles.atproto.did)}</p>
			{:else if signIn}
				<div class="row">
					<span class="spin"></span>
					<span>Waiting for your browser…</span>
					<button class="link" onclick={() => signIn?.abort()}>Cancel</button>
				</div>
			{:else}
				<form
					class="row"
					onsubmit={(e) => {
						e.preventDefault();
						if (handle.trim()) connect();
					}}
				>
					<input
						class="field mono"
						bind:value={handle}
						placeholder="alice.bsky.social"
						spellcheck="false"
					/>
					<button class="plate signal" disabled={!handle.trim()}>Connect</button>
				</form>
				{#if error}<p class="error">{error}</p>{/if}
			{/if}
		</section>
	</div>
{/if}

<style>
	.badge {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px;
		border-radius: 8px;
		text-align: left;
	}

	.badge:hover {
		background: var(--steel);
	}

	.avatar {
		position: relative;
		width: 30px;
		height: 30px;
		flex: none;
		display: grid;
		place-items: center;
		border: var(--hairline) solid var(--rule);
		border-radius: 50%;
		background: var(--steel);
		font-weight: 600;
	}

	.avatar.live::after {
		content: '';
		position: absolute;
		right: -1px;
		bottom: -1px;
		width: 8px;
		height: 8px;
		border: 2px solid var(--void);
		border-radius: 50%;
		background: var(--signal);
	}

	.who {
		display: grid;
		min-width: 0;
		line-height: 1.3;
	}

	.who .mono {
		font-size: var(--fs-mono);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	[popover] {
		inset: auto auto 64px 12px;
		width: min(330px, calc(100vw - 24px));
		margin: 0;
		padding: 14px;
		display: none;
		gap: 14px;
		border: var(--hairline) solid var(--rule);
		border-radius: 12px;
		background: var(--void);
		color: var(--bone);
	}

	[popover]:popover-open {
		display: grid;
	}

	section {
		display: grid;
		gap: 10px;
	}

	section + section {
		padding-top: 14px;
		border-top: var(--hairline) solid var(--rule);
	}

	h2 {
		font-size: var(--fs-body);
		font-weight: 500;
		color: var(--slate);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.row .plate.ghost {
		margin-left: auto;
		padding: 5px 10px;
	}

	.initial {
		width: 30px;
		padding: 6px 0;
	}

	.did {
		display: flex;
		gap: 8px;
		padding: 8px 10px;
		border: var(--hairline) solid var(--rule);
		background: var(--steel);
		clip-path: var(--clip-cut);
		font-family: var(--font-mono);
		font-size: var(--fs-mono);
		color: var(--ash);
		text-align: left;
		word-break: break-all;
	}

	.did :global(svg) {
		flex: none;
		color: var(--slate);
	}

	p {
		font-size: var(--fs-body);
	}

	.field {
		padding: 8px 10px;
	}

	.link {
		margin-left: auto;
		color: var(--slate);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
