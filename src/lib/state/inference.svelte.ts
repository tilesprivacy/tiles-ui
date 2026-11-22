import { api } from '#lib/api.ts';
import { changed } from '#lib/inference.ts';
import type { LlamaSetting } from '#lib/types.ts';

type Listed = { settings: LlamaSetting[] };

// the llama.cpp settings, which the daemon keeps. every change answers with the whole list
class Inference {
	settings = $state<LlamaSetting[] | null>(null);
	reason = $state('');

	changed = $derived((this.settings ?? []).filter(changed));

	async load() {
		try {
			this.#listed(await api<Listed>('config/llama'));
			this.reason = '';
		} catch (err) {
			this.reason = (err as Error).message;
		}
	}

	async set(name: string, value: number | boolean | string) {
		this.#listed(await api<Listed>('config/llama/set', 'POST', { values: { [name]: value } }));
	}

	async reset(name: string) {
		this.#listed(await api<Listed>('config/llama/reset', 'POST', { names: [name] }));
	}

	async resetAll() {
		this.#listed(await api<Listed>('config/llama/reset', 'POST', { all: true }));
	}

	#listed({ settings }: Listed) {
		this.settings = settings;
	}
}

export const inference = new Inference();
