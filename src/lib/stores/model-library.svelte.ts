/**
 * modelLibraryStore - the models Tiles can run, and the one downloading.
 *
 * Shared by the onboarding step, the Models page, the sidebar and the chat
 * bar, so progress reads the same everywhere and outlives any one page. The
 * daemon owns the download itself: one started by the CLI or before a reload
 * is joined rather than restarted, and a paused one keeps what arrived.
 */

import { browser } from '$app/environment';
import { TilekitService } from '$lib/services/tilekit.service';
import { agentStore } from '$lib/stores/agent.svelte';
import type {
	TilekitDownloadProgress,
	TilekitModelEntry,
	TilekitModelStatus
} from '$lib/types/tilekit';
import { ApiError } from '$lib/utils';

class ModelLibraryStore {
	/** the modelfile has edits of its own and the switch waits on a yes */
	confirmReplace = $state(false);
	error = $state<string | null>(null);
	/** set once a download finishes and its model is switched to */
	justReady = $state<string | null>(null);
	loading = $state(false);
	progress = $state<TilekitDownloadProgress | null>(null);
	selectedId = $state<string | null>(null);
	selecting = $state(false);
	status = $state<TilekitModelStatus | null>(null);
	private abort: AbortController | null = null;

	get downloading(): boolean {
		return this.progress?.phase === 'starting' || this.progress?.phase === 'downloading';
	}

	/** the model being downloaded, as the lineup names it */
	get downloadingModel(): TilekitModelEntry | null {
		if (!this.downloading) return null;

		return this.status?.models.find((model) => model.spec === this.progress?.spec) ?? null;
	}

	/** a model Tiles is set to run is whole on disk */
	get hasModel(): boolean {
		return !!this.status?.models.some((model) => model.active && model.state === 'ready');
	}

	get percent(): number {
		const progress = this.progress;

		return progress && progress.total_bytes
			? (progress.done_bytes / progress.total_bytes) * 100
			: 0;
	}

	get selected(): TilekitModelEntry | null {
		return this.status?.models.find((model) => model.id === this.selectedId) ?? null;
	}

	async cancel(): Promise<void> {
		try {
			this.progress = await TilekitService.cancelDownload();
		} catch (error) {
			this.error = message(error);
		}

		this.abort?.abort();
		await this.refresh();
	}

	/** Downloads `id`, or the selected model, continuing a partial download. */
	async download(id = this.selectedId): Promise<void> {
		const model = this.status?.models.find((entry) => entry.id === id);

		if (!model || this.downloading) return;

		this.selectedId = model.id;
		this.error = null;
		await this.follow(model.spec);
	}

	async refresh(): Promise<void> {
		if (!browser || this.loading) return;

		this.loading = true;

		try {
			this.status = await TilekitService.modelStatus();
			this.error = null;
			this.pickDefault();
			await this.joinRunning();
		} catch (error) {
			this.error = message(error);
		} finally {
			this.loading = false;
		}
	}

	select(id: string): void {
		if (this.downloading) return;

		this.selectedId = id;
		this.confirmReplace = false;
		this.error = null;
	}

	/** Makes `id`, or the selected downloaded model, the one Tiles runs. */
	async use(id = this.selectedId, replaceEdited = false): Promise<void> {
		const model = this.status?.models.find((entry) => entry.id === id);

		if (!model || this.selecting) return;

		this.selectedId = model.id;
		this.selecting = true;
		this.error = null;

		try {
			await TilekitService.selectModel(model.id, replaceEdited);
			this.confirmReplace = false;
			// the answer comes once the agent has reloaded onto the new model,
			// so this is when the chat bar can ask what it runs
			void agentStore.refresh();
			await this.refresh();
		} catch (error) {
			if (error instanceof ApiError && error.status === 409) {
				this.confirmReplace = true;
			} else {
				this.error = message(error);
			}
		} finally {
			this.selecting = false;
		}
	}

	private async follow(spec: string): Promise<void> {
		this.abort?.abort();

		const abort = new AbortController();

		this.abort = abort;

		try {
			for await (const state of TilekitService.downloadModel(spec, abort.signal)) {
				this.progress = state;

				if (state.phase === 'failed') this.error = state.error ?? 'The download failed';
			}
		} catch (error) {
			if (!abort.signal.aborted) this.error = message(error);
		} finally {
			if (this.abort === abort) this.abort = null;
		}

		if (this.progress?.phase !== 'done') return;

		await this.refresh();

		const model = this.status?.models.find((entry) => entry.spec === spec);

		// someone already running a model keeps it; a first model is switched to
		if (model && !this.hasModel) {
			await this.use(model.id);
			this.justReady = model.label;
		}
	}

	/** picks up a download the CLI or an earlier page started */
	private async joinRunning(): Promise<void> {
		if (this.abort) return;

		const running = await TilekitService.downloadState().catch(() => null);

		if (!running || !['starting', 'downloading'].includes(running.phase)) return;

		const model = this.status?.models.find((entry) => entry.spec === running.spec);

		if (model) this.selectedId = model.id;

		void this.follow(running.spec);
	}

	private pickDefault(): void {
		const models = this.status?.models ?? [];

		if (models.some((model) => model.id === this.selectedId)) return;

		// something already under way beats the recommendation
		const pick =
			models.find((model) => model.state === 'partial') ??
			models.find((model) => model.active && model.state === 'ready') ??
			models.find((model) => model.recommended) ??
			models[0];

		this.selectedId = pick?.id ?? null;
	}
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export const modelLibraryStore = new ModelLibraryStore();
