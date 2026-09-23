/**
 * onboardingStore - getting a new install to a working chat.
 *
 * A new account goes through three steps: the account itself, an optional
 * Atmosphere login, and a model. Someone whose model is missing later, a
 * deleted download say, only sees the model step.
 *
 * The daemon owns the download, so this can leave and come back: a download
 * started by the CLI, or before a reload, is joined rather than restarted,
 * and a cancelled one keeps what arrived for the next "Continue".
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

class OnboardingStore {
	/** set when this session created the account, which starts the full flow */
	newAccount = $state(false);
	atmosphereDone = $state(false);

	status = $state<TilekitModelStatus | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);

	selectedId = $state<string | null>(null);
	progress = $state<TilekitDownloadProgress | null>(null);
	/** the modelfile has edits of its own and the switch waits on a yes */
	confirmReplace = $state(false);
	selecting = $state(false);
	private abort: AbortController | null = null;

	get selected(): TilekitModelEntry | null {
		return this.status?.models.find((model) => model.id === this.selectedId) ?? null;
	}

	get downloading(): boolean {
		return this.progress?.phase === 'starting' || this.progress?.phase === 'downloading';
	}

	/** a model Tiles is set to run is whole on disk */
	get hasModel(): boolean {
		return !!this.status?.models.some((model) => model.active && model.state === 'ready');
	}

	get showAtmosphere(): boolean {
		return this.newAccount && !this.atmosphereDone;
	}

	/** show the model step: during the new-account flow, or once status says one is missing */
	get showModel(): boolean {
		if (this.showAtmosphere) return false;
		if (this.newAccount) return !this.hasModel;

		return this.status !== null && !this.hasModel;
	}

	accountCreated(): void {
		this.newAccount = true;
		void this.refresh();
	}

	finishAtmosphere(): void {
		this.atmosphereDone = true;
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

	/** Downloads the selected model, or continues its partial download. */
	async download(): Promise<void> {
		const model = this.selected;

		if (!model || this.downloading) return;

		this.error = null;
		await this.follow(model.spec);
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

	/** Makes the selected, downloaded model the one Tiles runs. */
	async start(replaceEdited = false): Promise<void> {
		const model = this.selected;

		if (!model || this.selecting) return;

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

	/** picks up a download the CLI or an earlier page started */
	private async joinRunning(): Promise<void> {
		if (this.abort) return;

		const running = await TilekitService.downloadState().catch(() => null);

		if (!running || running.phase === 'done' || running.phase === 'cancelled') return;
		if (running.phase === 'failed') return;

		const model = this.status?.models.find((entry) => entry.spec === running.spec);

		if (model) this.selectedId = model.id;

		void this.follow(running.spec);
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

		if (this.progress?.phase === 'done') {
			await this.refresh();
			await this.start();
		}
	}
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export const onboardingStore = new OnboardingStore();
