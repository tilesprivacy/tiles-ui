<script lang="ts">
	import DeviceDialog from './DeviceDialog.svelte';
	import Icon from './Icon.svelte';
	import { deviceName, devices } from '#lib/state/devices.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';
	import type { Device } from '#lib/types.ts';

	let view = $state<'link' | Device | null>(null);

	async function sync(device: Device) {
		try {
			await devices.sync(device);
			toasts.show(`Synced with ${deviceName(device)}`);
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}
</script>

<section aria-label="Devices">
	{#if devices.list.length}
		<div class="head">
			<h3>Devices</h3>
			<button
				class="icon tile row-tile"
				aria-label="Link a device"
				title="Link a device"
				onclick={() => (view = 'link')}><Icon name="plus" size={14} /></button
			>
		</div>
		<div class="list">
			{#each devices.list as device (device.user_id)}
				{@const syncing = devices.syncing.has(device.user_id)}
				<div class="device">
					<button class="name tile row-tile" title={device.user_id} onclick={() => (view = device)}>
						<Icon name="device" size={14} /><span>{deviceName(device)}</span>
					</button>
					<button
						class="icon tile row-tile"
						aria-label="Sync with {deviceName(device)}"
						title="Sync chats"
						disabled={syncing}
						onclick={() => sync(device)}
					>
						{#if syncing}<span class="spin"></span>{:else}<Icon name="sync" size={14} />{/if}
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<button class="add tile row-tile" onclick={() => (view = 'link')}>
			<span class="plus tile"><Icon name="plus" size={13} /></span>
			<span>Link a device<small class="muted">Sync chats across your devices</small></span>
		</button>
	{/if}
</section>

<DeviceDialog bind:view {sync} />

<style>
	section {
		padding: 6px 8px 8px;
		border-top: var(--hairline) solid var(--rule);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 4px 4px 8px;
	}

	h3 {
		font-size: var(--fs-label);
		font-weight: 400;
		color: var(--slate);
	}

	.list {
		max-height: 30vh;
		overflow-y: auto;
		overscroll-behavior: contain;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1px;
	}

	.device {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.name {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 6px 8px;
		color: var(--ash);
		text-align: left;
	}

	.name span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.name :global(svg) {
		flex: none;
		color: var(--slate);
	}

	.icon {
		width: 26px;
		height: 26px;
		flex: none;
		display: grid;
		place-items: center;
		color: var(--slate);
	}

	.name:hover,
	.icon:hover:not(:disabled) {
		background-color: var(--steel);
		color: var(--bone);
	}

	/* only on the row being hovered, unless it's syncing */
	.device .icon:not(:disabled) {
		opacity: 0;
	}

	.device:hover .icon,
	.device .icon:focus-visible {
		opacity: 1;
	}

	.add {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 8px;
		color: var(--ash);
		text-align: left;
	}

	.add:hover {
		background-color: var(--steel);
		color: var(--bone);
	}

	.plus {
		width: 22px;
		height: 22px;
		flex: none;
		display: grid;
		place-items: center;
		--line: var(--edge);
		border-style: dashed;
		color: var(--slate);
	}

	.add:hover .plus {
		--line: var(--slate);
		color: var(--bone);
	}

	small {
		display: block;
		font-size: var(--fs-label);
	}

	/* touch screens have no hover to show it */
	@media (hover: none) {
		.device .icon:not(:disabled) {
			opacity: 1;
		}
	}
</style>
