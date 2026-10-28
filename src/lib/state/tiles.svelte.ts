import { api, ApiError, stream } from '#lib/api.ts';
import type { Account, Atproto, LoadedModel } from '#lib/types.ts';

type Phase = 'loading' | 'welcome' | 'starting' | 'ready' | 'failed';

const status = (err: unknown) => (err instanceof ApiError ? err.status : -1);
const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

class Tiles {
	phase = $state<Phase>('loading');
	reason = $state('');
	offline = $state(false);
	account = $state<Account | null>(null);
	atproto = $state<Atproto | null>(null);
	// the inference server, and the model it has loaded
	server = $state<'on' | 'off' | 'starting'>('off');
	model = $state<LoadedModel | null>(null);

	async boot() {
		this.phase = 'loading';
		try {
			this.account = await api<Account>('account/status');
		} catch (err) {
			if (status(err) === 404) this.phase = 'welcome';
			else this.fail(err);
			return;
		}
		this.loadAtproto();
		if (!(await this.ping())) {
			this.phase = 'starting';
			try {
				await this.startServer();
			} catch (err) {
				return this.fail(err);
			}
		}
		this.phase = 'ready';
	}

	async createAccount(nickname: string) {
		try {
			this.account = await api<Account>('account/create', 'POST', { nickname });
		} catch (err) {
			// made from the CLI meanwhile
			if (status(err) !== 409) throw err;
			this.account = await api<Account>('account/status');
		}
	}

	async loadAtproto() {
		try {
			this.atproto = await api<Atproto>('atproto/status');
		} catch {
			this.atproto = null;
		}
	}

	// `tab` is opened by the click, before the sign-in page is known, so it isn't blocked
	async signIn(handle: string, tab: Window | null, signal: AbortSignal) {
		const body = { user_handle: handle.trim().replace(/^@/, '') };
		for await (const { event, data } of stream('atproto/login', { method: 'POST', body, signal })) {
			const message = JSON.parse(data);
			if (event === 'authorize') {
				if (tab) tab.location.href = message.url;
				else window.open(message.url, '_blank', 'noopener');
			} else if (event === 'signed_in') {
				this.atproto = message;
				return;
			} else if (event === 'error') {
				throw new Error(message.reason);
			}
		}
		if (!signal.aborted) throw new Error('Sign-in stopped before it finished. Try again.');
	}

	async signOut() {
		await api('atproto/logout', 'POST');
		this.atproto = null;
	}

	// whether the model server answered
	async ping() {
		try {
			const { model } = await api<{ model: LoadedModel | null }>('server/ping');
			this.server = 'on';
			this.model = model;
			this.offline = false;
			return true;
		} catch (err) {
			if (this.server !== 'starting') this.server = 'off';
			this.offline = status(err) === 0;
			return false;
		}
	}

	async startServer() {
		this.server = 'starting';
		try {
			await api('server/start', 'POST');
		} catch (err) {
			// 503 means it's still booting
			if (status(err) !== 503) {
				this.server = 'off';
				throw err;
			}
		}
		for (let tries = 0; tries < 60; tries++) {
			if (await this.ping()) return;
			await new Promise((done) => setTimeout(done, 1000));
		}
		this.server = 'off';
		throw new Error("The model server didn't start. Its log is logs/server.err.log");
	}

	fail(err: unknown) {
		this.phase = 'failed';
		this.reason = reason(err);
	}
}

export const tiles = new Tiles();
