export type Account = { id: string; nickname: string };

export type Atproto = { handle: string; did: string };

export type LoadedModel = { state: 'none' | 'loading' | 'loaded'; path: string | null };

export type Download =
	| { state: 'idle' | 'done' }
	| { state: 'downloading'; done: number; total: number; bytes_per_sec: number }
	| { state: 'verifying' | 'paused'; done: number; total: number }
	| { state: 'failed'; reason: string };

export type ModelChange = { model: string } & Download;

export type ModelStatus = {
	model: string;
	total: number | null;
	on_disk: number | null;
	free_disk: number | null;
	download: Download;
};

export type Model = { id: string; label: string; default: boolean; current: boolean } & (
	ModelStatus | { model: string | null; error: string }
);

// the llama.cpp builds Tiles can run models with
export type EngineName = 'cuda-13' | 'cuda-12' | 'vulkan' | 'cpu' | 'metal';

export type Gpu = {
	vendor: 'nvidia' | 'amd' | 'intel' | 'apple' | 'other';
	name: string | null;
	compute_capability: string | null;
	// bytes. on a Mac its unified memory
	vram: number | null;
};

export type EngineChoice = {
	engine: EngineName;
	label: string;
	// bytes, 0 for the one that comes with Tiles
	download: number;
	unavailable?: string;
};

export type EngineInstall =
	| { state: 'idle' }
	| { state: 'downloading'; engine: EngineName; done: number; total: number; bytes_per_sec: number }
	| { state: 'paused'; engine: EngineName; done: number; total: number }
	| { state: 'unpacking' | 'checking' | 'done'; engine: EngineName }
	| { state: 'failed'; engine: EngineName; reason: string };

export type EngineStatus = {
	llama_cpp: string;
	pick: EngineName | 'auto';
	auto: EngineName;
	// the one replies use, the pick when it can run here
	engine: EngineName;
	installed: { engine: EngineName; llama_cpp: string } | null;
	needs_download: boolean;
	// a llama-server set by hand with TILES_LLAMA_SERVER_BIN
	override: string | null;
	download: EngineInstall;
	gpus: Gpu[];
	nvidia_driver: string | null;
	engines: EngineChoice[];
};

export type Session = { id: string; name: string; created_at: number };

export type Role = 'user' | 'assistant';

export type Chat = { id: string; content: string; role: Role; created_at: number };
