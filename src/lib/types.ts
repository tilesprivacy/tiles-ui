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

export type Session = { id: string; name: string; created_at: number };

export type Role = 'user' | 'assistant';

export type Chat = { id: string; content: string; role: Role; created_at: number };
