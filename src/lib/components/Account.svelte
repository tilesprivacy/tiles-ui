<script lang="ts">
	import Icon from './Icon.svelte';
	import Info from './Info.svelte';
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
	<button
		class="badge tile row-tile"
		class:compact
		popovertarget="account"
		aria-label="Your accounts"
	>
		<span class="avatar tile" class:live={tiles.atproto}>{initial}</span>
		{#if !compact}
			<span class="who">
				<span>{account.nickname}</span>
				<span class="muted">{tiles.atproto ? `@${tiles.atproto.handle}` : 'Local account'}</span>
			</span>
		{/if}
	</button>

	<div id="account" class="tile" popover>
		<section>
			<h2>
				Tiles Account
				<Info
					text="Your identity, generated on this device. It links your devices and keeps your chats end-to-end encrypted."
				/>
			</h2>
			<div class="row">
				<span class="plate initial">{initial}</span>
				<b>{account.nickname}</b>
			</div>
			<button class="did tile" onclick={() => copy(account.id)} aria-label="Copy your DID">
				<span>{account.id}</span>
				<Icon name="copy" size={13} />
			</button>
			<p class="muted">
				Your account lives on this device. Its DID is how other devices and apps know it's you.
			</p>
		</section>

		<section>
			<h2>
				Atmosphere Account
				<Info
					text="Chats you share are published to your Personal Data Server (PDS), hosted wherever you choose."
				/>
			</h2>
			{#if tiles.atproto}
				<div class="row">
					<span class="plate initial">{tiles.atproto.handle.charAt(0).toUpperCase()}</span>
					<span class="who">
						<span class="mono handle">@{tiles.atproto.handle}</span>
						<span class="mono muted">{short(tiles.atproto.did)}</span>
					</span>
				</div>
				<button class="plate ghost out" onclick={signOut}>Sign out</button>
			{:else if signIn}
				<div class="row">
					<span class="spin"></span>
					{#if tiles.authorizing}
						<span>Waiting for your browser…</span>
					{:else}
						<span>Getting the sign-in page ready…</span>
					{/if}
					<button class="link" onclick={() => signIn?.abort()}>Cancel</button>
				</div>
			{:else}
				<form
					class="connect"
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
					<button class="plate primary" disabled={!handle.trim()}>Connect</button>
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
		text-align: left;
	}

	.badge:hover {
		background-color: var(--steel);
	}

	/* on a rail the avatar is the whole tile, and lifts on hover itself */
	.compact {
		justify-content: center;
		padding: 0;
	}

	.compact:hover .avatar {
		background-color: var(--lift);
	}

	.avatar {
		position: relative;
		width: 30px;
		height: 30px;
		flex: none;
		display: grid;
		place-items: center;
		background-color: var(--steel);
		font-weight: 600;
	}

	.avatar.live::after {
		content: '';
		position: absolute;
		/* top right, the bottom right is cut off */
		top: 0;
		right: 0;
		width: 6px;
		height: 6px;
		background: var(--signal);
	}

	.who {
		display: grid;
		min-width: 0;
		line-height: 1.3;
	}

	.who .muted {
		font-size: var(--fs-body);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* as wide as the row that opens it, inside an open sidebar */
	[popover] {
		inset: auto auto 64px 12px;
		width: min(calc(var(--sidebar) - 24px), calc(100vw - 24px));
		margin: 0;
		padding: 14px;
		display: none;
		gap: 14px;
		--r: var(--radius-m);
		background-color: var(--panel);
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
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--fs-body);
		font-weight: 500;
		color: var(--slate);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.out {
		justify-self: start;
		padding: 5px 10px;
	}

	.connect {
		display: grid;
		gap: 8px;
	}

	.connect .plate {
		justify-self: start;
	}

	.initial {
		width: 30px;
		flex: none;
		padding: 6px 0;
	}

	.handle {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.did {
		display: flex;
		gap: 8px;
		padding: 8px 10px;
		background-color: var(--steel);
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
