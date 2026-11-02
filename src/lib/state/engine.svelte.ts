import { api, stream } from '#lib/api.ts';
import type { EngineInstall, EngineName, EngineStatus } from '#lib/types.ts';

export const installing = (install: EngineInstall) =>
	install.state === 'downloading' || install.state === 'unpacking' || install.state === 'checking';

class Engine {
	status = $state<EngineStatus | null>(null);
	reason = $state('');
	#following = false;

	// the GPU models run on, the NVIDIA one first
	gpu = $derived(
		this.status?.gpus.find((g) => g.vendor === 'nvidia' && g.name) ??
			this.status?.gpus.find((g) => g.name)
	);

	// what replies run on now. a pick that isn't downloaded yet waits on the one on disk
	running = $derived.by(() => {
		const status = this.status;
		if (!status || !status.needs_download) return status?.engine;
		return status.installed?.engine ?? 'cpu';
	});

	// "CUDA 13.4 on the NVIDIA GeForce RTX 5060 Ti", or "the CPU"
	runsOn = $derived.by(() => {
		const name = this.running;
		if (!name) return '';
		if (name === 'cpu') return 'the CPU';
		return this.gpu?.name ? `${this.label(name)} on the ${this.gpu.name}` : this.label(name);
	});

	label = (name: EngineName | undefined) =>
		this.status?.engines.find((e) => e.engine === name)?.label ?? name ?? '';

	async load() {
		try {
			this.status = await api<EngineStatus>('engine/status');
			this.reason = '';
			if (installing(this.status.download)) this.#follow();
		} catch (err) {
			this.reason = (err as Error).message;
		}
	}

	// "auto" or an engine. a pick that failed its check is tried again
	async select(engine: EngineName | 'auto') {
		this.status = await api<EngineStatus>('engine/select', 'POST', { engine });
	}

	async download() {
		this.#set(await api<EngineInstall>('engine/download', 'POST'));
		this.#follow();
	}

	async pause() {
		this.#set(await api<EngineInstall>('engine/download', 'DELETE'));
	}

	#set(install: EngineInstall) {
		if (this.status) this.status.download = install;
	}

	// the stream ends once the install stops, then the status has what changed
	async #follow() {
		if (this.#following) return;
		this.#following = true;
		try {
			for await (const { data } of stream('engine/download')) this.#set(JSON.parse(data));
		} catch {
			// Tiles went away, the next load picks it up
			await new Promise((done) => setTimeout(done, 2000));
		} finally {
			this.#following = false;
		}
		await this.load();
	}
}

export const engine = new Engine();
