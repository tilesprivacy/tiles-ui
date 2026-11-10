import { api, stream } from '#lib/api.ts';
import type { EngineInstall, EngineName, EngineStatus } from '#lib/types.ts';

// what each engine is for, as the user reads it
export const about: Record<EngineName, string> = {
	'cuda-13': 'NVIDIA GPUs and drivers from the last few years. The fastest on them',
	'cuda-12': 'Older NVIDIA GPUs and drivers',
	vulkan: 'Most GPUs, from AMD, Intel and NVIDIA',
	cpu: 'Any computer. The slowest, and it always works',
	metal: 'Uses the GPU on Apple silicon to run models.'
};

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

	// GPU memory a model can fill. a Mac's GPU gets about three quarters of its unified memory
	usableVram = $derived(
		this.gpu?.vram ? (this.gpu.vendor === 'apple' ? this.gpu.vram * 0.75 : this.gpu.vram) : null
	);

	// a Mac has Metal and nothing else to pick
	apple = $derived(this.status?.engine === 'metal');

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

	// returns the bytes freed. replies go back to the CPU
	async delete() {
		const { freed } = await api<{ freed: number }>('engine/delete', 'POST');
		await this.load();
		return freed;
	}

	async pause() {
		this.#set(await api<EngineInstall>('engine/download/pause', 'POST'));
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
