<script lang="ts">
	import Icon from './Icon.svelte';
	import { deviceName, devices } from '#lib/state/devices.svelte.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';
	import type { Device } from '#lib/types.ts';

	let {
		view = $bindable(null),
		sync
	}: { view?: 'link' | Device | null; sync: (device: Device) => Promise<void> } = $props();

	let dialog: HTMLDialogElement;
	let tab = $state<'join' | 'invite'>('join');
	// the other device's ID or the code it made, and the name it gets here
	let input = $state('');
	let name = $state('');
	let code = $state('');
	let busy = $state(false);
	let error = $state('');
	let unlinking = $state(false);

	const device = $derived(view && view !== 'link' ? view : null);
	// the invited device, once it has joined
	const joined = $derived(code ? devices.list.find((d) => d.user_id === input.trim()) : undefined);

	$effect(() => {
		if (view && !dialog.open) {
			reset();
			name = device?.username ?? '';
			dialog.showModal();
		}
		if (!view && dialog.open) dialog.close();
	});

	// the invited device joins on its own, so look for it while the code shows
	$effect(() => {
		if (!code || joined) return;
		const timer = setInterval(() => devices.load(), 3000);
		return () => clearInterval(timer);
	});

	function reset() {
		input = name = code = error = '';
		busy = unlinking = false;
	}

	function pick(next: typeof tab) {
		tab = next;
		reset();
	}

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		toasts.show('Copied');
	}

	async function run(action: () => Promise<void>) {
		busy = true;
		error = '';
		try {
			await action();
		} catch (err) {
			error = (err as Error).message;
		}
		busy = false;
	}

	const invite = () =>
		run(async () => {
			code = await devices.invite(input, name);
		});

	const join = () =>
		run(async () => {
			await devices.join(input, name);
			toasts.show(name.trim() ? `Linked with ${name.trim()}` : 'Linked');
			view = null;
		});

	async function rename(device: Device) {
		if (name.trim() === (device.username ?? '')) return;
		try {
			await devices.rename(device, name);
		} catch (err) {
			error = (err as Error).message;
		}
	}

	const unlink = (device: Device) =>
		run(async () => {
			await devices.unlink(device);
			toasts.show(`Unlinked ${deviceName(device)}`);
			view = null;
		});
</script>

<dialog
	class="tile"
	bind:this={dialog}
	onclose={() => (view = null)}
	aria-label={device ? deviceName(device) : 'Link a device'}
>
	<header>
		<h2>{device ? deviceName(device) : 'Link a device'}</h2>
		<button class="icon tile row-tile" aria-label="Close" onclick={() => (view = null)}>
			<Icon name="x" size={15} />
		</button>
	</header>

	{#if !devices.network}
		<p class="notice">
			<span>Tiles' network is off, so your devices can't reach this one.</span>
			<button class="plate" onclick={() => run(() => devices.startNetwork())}>Turn on</button>
		</p>
	{/if}

	{#if device}
		<form
			class="body"
			onsubmit={(e) => {
				e.preventDefault();
				rename(device);
			}}
		>
			<label>
				<span>Name</span>
				<input
					class="field"
					bind:value={name}
					onblur={() => rename(device)}
					placeholder="e.g. Work laptop"
					spellcheck="false"
				/>
			</label>
			<div class="label">
				<span>ID</span>
				<button type="button" class="copy tile" onclick={() => copy(device.user_id)}>
					<span>{device.user_id}</span><Icon name="copy" size={13} />
				</button>
			</div>
			<p class="muted">Syncing sends each device the chats it doesn't have yet, both ways.</p>
			{#if error}<p class="error">{error}</p>{/if}
		</form>
		<footer>
			{#if unlinking}
				<span class="ask">It stops syncing with this one. Unlink it?</span>
				<button class="plate ghost" onclick={() => (unlinking = false)}>Cancel</button>
				<button class="plate danger" disabled={busy} onclick={() => unlink(device)}>Unlink</button>
			{:else}
				<button class="plate ghost danger" onclick={() => (unlinking = true)}>Unlink</button>
				<button
					class="plate primary"
					disabled={devices.syncing.has(device.user_id)}
					onclick={() => sync(device)}
				>
					{#if devices.syncing.has(device.user_id)}<span class="spin"></span>Syncing…{:else}Sync
						chats{/if}
				</button>
			{/if}
		</footer>
	{:else}
		<div class="body">
			<p class="muted">
				Sync chats directly between your devices while Tiles is open on both. Start on the device
				you want to add.
			</p>
			<div class="tabs" role="tablist">
				<button
					class="tile row-tile"
					role="tab"
					aria-selected={tab === 'join'}
					class:on={tab === 'join'}
					onclick={() => pick('join')}>Set up this device</button
				>
				<button
					class="tile row-tile"
					role="tab"
					aria-selected={tab === 'invite'}
					class:on={tab === 'invite'}
					onclick={() => pick('invite')}>Add another device</button
				>
			</div>

			{#if tab === 'join'}
				<div class="label">
					<span>Copy this device's ID</span>
					<button class="copy tile" onclick={() => tiles.account && copy(tiles.account.id)}>
						<span>{tiles.account?.id}</span><Icon name="copy" size={13} />
					</button>
					<small class="muted">
						On your other device, open Link a device, choose Add another device, and paste this ID.
					</small>
				</div>
				<form
					class="steps"
					onsubmit={(e) => {
						e.preventDefault();
						if (input.trim()) join();
					}}
				>
					<label>
						<span>Paste the linking code</span>
						<textarea
							class="field mono"
							bind:value={input}
							rows="3"
							spellcheck="false"
							disabled={busy}></textarea>
						<small class="muted">Copy the code shown on your other device and paste it here.</small>
					</label>
					<label>
						<span>Name your other device</span>
						<input
							class="field"
							bind:value={name}
							placeholder="e.g. Work laptop"
							spellcheck="false"
							disabled={busy}
						/>
					</label>
					{#if error}<p class="error">{error}</p>{/if}
					{#if busy}
						<p class="wait">
							<span class="spin"></span>Linking with {name.trim() || 'it'}. Keep Tiles open on it.
						</p>
					{:else}
						<button class="plate primary" disabled={!input.trim()}>Link devices</button>
					{/if}
				</form>
			{:else if joined}
				<p class="done"><Icon name="check" size={15} />Linked with {deviceName(joined)}</p>
				<button class="plate primary" onclick={() => (view = null)}>Done</button>
			{:else if code}
				<div class="label">
					<span>Copy this linking code</span>
					<button class="copy tile code" onclick={() => copy(code)}>
						<span>{code}</span><Icon name="copy" size={13} />
					</button>
					<small class="muted">On your other device, paste it under Paste the linking code.</small>
				</div>
				<p class="wait"><span class="spin"></span>Waiting for {name.trim() || 'it'} to join…</p>
			{:else}
				<form
					class="steps"
					onsubmit={(e) => {
						e.preventDefault();
						if (input.trim()) invite();
					}}
				>
					<label>
						<span>Paste your other device's ID</span>
						<input
							class="field mono"
							bind:value={input}
							placeholder="did:key:z6Mk…"
							spellcheck="false"
						/>
						<small class="muted">
							On your other device, open Link a device, choose Set up this device, and copy its ID.
						</small>
					</label>
					<label>
						<span>Name your other device</span>
						<input
							class="field"
							bind:value={name}
							placeholder="e.g. Work laptop"
							spellcheck="false"
						/>
					</label>
					{#if error}<p class="error">{error}</p>{/if}
					<button class="plate primary" disabled={!input.trim() || busy}>Create linking code</button
					>
				</form>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	/* centred under the title bar, clear of the traffic lights */
	dialog {
		top: var(--titlebar, 0px);
		width: min(440px, calc(100vw - 32px));
		max-height: calc(100% - var(--titlebar, 0px) - 32px);
		margin: auto;
		padding: 0;
		--r: var(--radius-l);
		background-color: var(--panel);
		color: var(--bone);
	}

	dialog[open] {
		display: grid;
		grid-template-rows: auto auto 1fr auto;
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.55);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 14px 4px 20px;
	}

	h2 {
		font-size: var(--fs-title);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.icon {
		width: 26px;
		height: 26px;
		flex: none;
		display: grid;
		place-items: center;
		color: var(--slate);
	}

	.icon:hover {
		background-color: var(--steel);
		color: var(--bone);
	}

	.notice {
		margin: 8px 20px 0;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 8px 8px 12px;
		border: var(--hairline) solid color-mix(in srgb, var(--alert) 35%, transparent);
		border-radius: var(--radius);
		font-size: var(--fs-body);
		color: var(--ash);
	}

	.notice .plate {
		margin-left: auto;
		padding: 5px 10px;
	}

	.body,
	.steps {
		display: grid;
		align-content: start;
		gap: 14px;
	}

	.body {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 12px 20px 20px;
	}

	p,
	small {
		font-size: var(--fs-body);
	}

	label,
	.label {
		display: grid;
		gap: 6px;
	}

	label > span,
	.label > span {
		font-size: var(--fs-body);
		color: var(--ash);
	}

	.field {
		padding: 8px 10px;
	}

	textarea {
		resize: vertical;
		font-size: var(--fs-mono);
		word-break: break-all;
	}

	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2px;
		padding: 2px;
		border: var(--hairline) solid var(--rule);
		border-radius: var(--radius);
	}

	.tabs button {
		padding: 6px 8px;
		font-size: var(--fs-body);
		color: var(--slate);
	}

	.tabs button:hover,
	.tabs button.on {
		background-color: var(--steel);
		color: var(--bone);
	}

	/* the tabs sit side by side, the bar would read as a third mark */
	.tabs button.on::before {
		display: none;
	}

	.copy {
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

	.copy:hover {
		--line: var(--edge);
	}

	.copy :global(svg) {
		flex: none;
		color: var(--slate);
	}

	/* a code runs to a few hundred characters */
	.code span {
		max-height: 7.5em;
		overflow-y: auto;
	}

	.wait,
	.done {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--ash);
	}

	.done :global(svg) {
		color: var(--signal);
	}

	.steps > .plate,
	.body > .plate {
		justify-self: start;
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 20px;
		border-top: var(--hairline) solid var(--rule);
	}

	footer .ghost.danger {
		margin-right: auto;
	}

	.ask {
		margin-right: auto;
		font-size: var(--fs-body);
		color: var(--ash);
	}

	.danger {
		--line: color-mix(in srgb, var(--alert) 45%, transparent);
		color: var(--alert);
	}
</style>
