import { SvelteSet } from 'svelte/reactivity';
import { api } from '#lib/api.ts';
import type { Session } from '#lib/types.ts';

const DAY = 86_400_000;

function group(created: number, today: number) {
	if (created >= today) return 'Today';
	if (created >= today - DAY) return 'Yesterday';
	if (created >= today - 7 * DAY) return 'Previous 7 days';
	return 'Older';
}

class Sessions {
	list = $state<Session[]>([]);
	reason = $state('');
	// ids of chats with a reply streaming in
	busy = new SvelteSet<string>();

	async load() {
		try {
			this.list = await api<Session[]>('session/list');
			this.reason = '';
		} catch (err) {
			this.reason = (err as Error).message;
		}
	}

	// newest first, under Today, Yesterday, Previous 7 days and Older
	grouped(query = '') {
		const today = new Date().setHours(0, 0, 0, 0);
		const needle = query.trim().toLowerCase();
		const groups = new Map<string, Session[]>();
		for (const session of this.list) {
			if (needle && !session.name.toLowerCase().includes(needle)) continue;
			const name = group(session.created_at, today);
			groups.set(name, [...(groups.get(name) ?? []), session]);
		}
		return [...groups];
	}
}

export const sessions = new Sessions();
