import { api, stream } from '#lib/api.ts';
import { percent, size } from '#lib/format.ts';
import type { Download, Model, ModelChange, ModelStatus } from '#lib/types.ts';

export type Listed = Model & ModelStatus;

export const isListed = (model: Model): model is Listed => !('error' in model);

export const running = (download: Download) =>
	download.state === 'downloading' || download.state === 'verifying';

// a download must leave this much free, as Tiles itself checks
const SPARE = 1e9;

// what a model's row says, and whether it can be picked
export function describe(model: Model) {
	if (!isListed(model)) return { size: '', note: model.error, ready: false, blocked: true };
	const { download: d, total } = model;
	if (d.state === 'done' || total === null) {
		return { size: '', note: 'On your computer', ready: true, blocked: false };
	}
	const needed = total - (model.on_disk ?? 0) + SPARE;
	const short = model.free_disk !== null && !running(d) && needed > model.free_disk;
	const note =
		d.state === 'downloading'
			? `Downloading ${percent(d.done, d.total)}%`
			: d.state === 'verifying'
				? 'Checking what is already downloaded…'
				: d.state === 'paused'
					? `Paused at ${size(d.done)} of ${size(d.total)}`
					: d.state === 'failed'
						? d.reason
						: short
							? `Needs ${size(needed - model.free_disk!)} more free space`
							: '';
	return { size: size(total), note, ready: false, blocked: short };
}

class Models {
	list = $state<Model[]>([]);
	reason = $state('');
	#watching = false;

	// the download under way, if any. one runs at a time
	active = $derived(
		this.list.find((m) => isListed(m) && running(m.download)) as Listed | undefined
	);

	async load() {
		try {
			this.list = (await api<{ models: Model[] }>('model/status')).models;
			this.reason = '';
		} catch (err) {
			this.reason = (err as Error).message;
		}
	}

	// follows downloads from every client, the CLI included, for as long as the page is open
	async watch() {
		if (this.#watching) return;
		this.#watching = true;
		for (;;) {
			try {
				for await (const { data } of stream('model/events')) this.#apply(JSON.parse(data));
			} catch {
				// Tiles went away, try again shortly
			}
			await new Promise((done) => setTimeout(done, 2000));
			await this.load();
		}
	}

	#apply({ model, ...download }: ModelChange) {
		const entry = this.list.find((m) => m.model === model);
		if (!entry || !isListed(entry)) return;
		entry.download = download;
		// a finished download changes what's on disk, which only the list knows
		if (download.state === 'done') this.load();
	}

	async download(model: string) {
		this.#apply({ model, ...(await api<Download>('model/download', 'POST', { model })) });
	}

	async pause(model: string) {
		const query = encodeURIComponent(model);
		this.#apply({ model, ...(await api<Download>(`model/download?model=${query}`, 'DELETE')) });
	}
}

export const models = new Models();
