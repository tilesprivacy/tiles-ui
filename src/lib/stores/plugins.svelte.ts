/**
 * pluginsStore - plugins as the daemon sees them.
 *
 * The catalog in `$lib/plugins` says what exists; this says what is installed
 * here and whether it is on. The daemon applies a change to the running agent
 * itself, so there is nothing to confirm here, only an error to show when it
 * could not.
 *
 * When the daemon is unreachable (the static site, or Tiles not running)
 * `available` stays false and pages fall back to showing the CLI command.
 */

import { browser } from '$app/environment';
import { TilekitService } from '$lib/services/tilekit.service';
import type { TilekitPlugin, TilekitPluginChange } from '$lib/types/tilekit';

class PluginsStore {
	available = $state(false);
	/** names with a request in flight, so their controls can wait */
	busy = $state<string[]>([]);
	error = $state<string | null>(null);
	installing = $state(false);
	loaded = $state(false);
	notice = $state<string | null>(null);
	plugins = $state<TilekitPlugin[]>([]);

	byName(name: string): TilekitPlugin | undefined {
		return this.plugins.find((plugin) => plugin.name === name);
	}

	dismissNotice(): void {
		this.notice = null;
		this.error = null;
	}

	async install(source: string): Promise<boolean> {
		const trimmed = source.trim();

		if (!trimmed || this.installing) return false;

		this.installing = true;

		const ok = await this.run(() => TilekitService.installPlugin(trimmed));

		this.installing = false;

		return ok;
	}

	isBusy(name: string): boolean {
		return this.busy.includes(name);
	}

	async refresh(): Promise<void> {
		if (!browser) return;

		try {
			this.plugins = await TilekitService.listPlugins();
			this.available = true;
		} catch {
			this.available = false;
		} finally {
			this.loaded = true;
		}
	}

	async setEnabled(name: string, enabled: boolean): Promise<boolean> {
		return this.withBusy(name, () => TilekitService.setPluginEnabled(name, enabled));
	}

	async uninstall(name: string): Promise<boolean> {
		return this.withBusy(name, () => TilekitService.uninstallPlugin(name));
	}

	private async run(change: () => Promise<TilekitPluginChange>): Promise<boolean> {
		this.error = null;
		this.notice = null;

		try {
			const result = await change();

			if (result.reload === 'failed') {
				this.error = `Saved, but the agent could not reload: ${result.reload_error ?? 'unknown error'}`;
			} else if (result.mcp_dormant) {
				this.notice = result.message;
			}

			await this.refresh();

			return true;
		} catch (err) {
			this.error = message(err);

			return false;
		}
	}

	private async withBusy(
		name: string,
		change: () => Promise<TilekitPluginChange>
	): Promise<boolean> {
		if (this.isBusy(name)) return false;

		this.busy = [...this.busy, name];

		try {
			return await this.run(change);
		} finally {
			this.busy = this.busy.filter((entry) => entry !== name);
		}
	}
}

function message(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

export const pluginsStore = new PluginsStore();
