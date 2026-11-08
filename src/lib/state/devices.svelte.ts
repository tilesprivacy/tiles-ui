import { SvelteSet } from 'svelte/reactivity';
import { api } from '#lib/api.ts';
import { sessions } from '#lib/state/sessions.svelte.ts';
import type { Device } from '#lib/types.ts';

export const deviceName = (device: Device) =>
	device.username || `${device.user_id.slice(0, 14)}…${device.user_id.slice(-4)}`;

class Devices {
	list = $state<Device[]>([]);
	// whether this device can reach the others and be reached
	network = $state(true);
	// ids of the devices a sync is running with
	syncing = new SvelteSet<string>();

	async load() {
		try {
			this.list = await api<Device[]>('peers/list-linked-devices', 'POST');
			const { is_network_running } = await api<{ is_network_running: boolean }>(
				'net/status',
				'POST'
			);
			this.network = is_network_running;
		} catch {
			// keeps what it had, the reconnect bar covers a stopped daemon
		}
	}

	async startNetwork() {
		await api('net/start-network', 'POST');
		this.network = true;
	}

	// a code for the device with `id` to join with
	async invite(id: string, name: string) {
		const { token } = await api<{ token: string }>('authz/create-token', 'POST', {
			aud_did: id.trim(),
			capability: { type: 'all' },
			aud_nickname: name.trim() || null
		});
		return token;
	}

	async join(code: string, name: string) {
		const token = code.trim();
		await api('authz/add-token', 'POST', {
			delegated_token: token,
			issuer_nickname: name.trim() || null
		});
		await api('net/link-device', 'POST', { token });
		await this.load();
	}

	async sync(device: Device) {
		this.syncing.add(device.user_id);
		try {
			await api('net/sync-with-device', 'POST', { handle: device.user_id });
		} finally {
			this.syncing.delete(device.user_id);
		}
		await sessions.load();
	}

	async rename(device: Device, name: string) {
		const renamed = await api<Device>('peers/update-peer', 'POST', {
			user_did: device.user_id,
			username: name.trim() || null
		});
		device.username = renamed.username;
	}

	async unlink(device: Device) {
		await api('peers/revoke', 'POST', { peer_did: device.user_id });
		this.list = this.list.filter((d) => d.user_id !== device.user_id);
	}
}

export const devices = new Devices();
