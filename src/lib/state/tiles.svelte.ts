import { api, ApiError, stream } from '#lib/api.ts';
import { desktop } from '#lib/desktop.ts';
import type { Account, Atproto, LoadedModel } from '#lib/types.ts';

// connecting: the desktop app is still bringing the daemon up
type Phase = 'loading' | 'connecting' | 'welcome' | 'starting' | 'ready' | 'failed';

// the app starts the daemon, a daemon still down after this isn't coming
const CONNECT_TRIES = 30;

const status = (err: unknown) => (err instanceof ApiError ? err.status : -1);
const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

class Tiles {
	phase = $state<Phase>('loading');
	reason = $state('');
	offline = $state(false);
	account = $state<Account | null>(null);
	atproto = $state<Atproto | null>(null);
	// the sign-in page has been handed to the browser
	authorizing = $state(false);
	// the inference server, and the model it has loaded
	server = $state<'on' | 'off' | 'starting'>('off');
	model = $state<LoadedModel | null>(null);

	async boot() {
		this.phase = 'loading';
		try {
			this.account = await this.reach();
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

	// in the app, waits while the daemon comes up
	async reach() {
		const app = desktop();
		if (app?.problem) throw new Error(app.problem);
		for (let tries = 1; ; tries++) {
			try {
				return await api<Account>('account/status');
			} catch (err) {
				if (!app || status(err) !== 0) throw err;
				if (tries === CONNECT_TRIES)
					throw new Error("Tiles isn't running. Start it with `tiles daemon start`.");
				this.phase = 'connecting';
				await new Promise((done) => setTimeout(done, 1000));
			}
		}
	}

	async createAccount(nickname: string) {
		try {
			this.account = await api<Account>('account/create', 'POST', { nickname });
		} catch (err) {
			// already made from the CLI
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

	// open `tab` right on the click, or the popup blocker stops it
	async signIn(handle: string, tab: Window | null, signal: AbortSignal) {
		const body = { user_handle: handle.trim().replace(/^@/, '') };
		try {
			for await (const { event, data } of stream('atproto/login', {
				method: 'POST',
				body,
				signal
			})) {
				const message = JSON.parse(data);
				if (event === 'authorize') {
					this.authorizing = true;
					if (tab) tab.location.href = message.url;
					// the app gives no tab, leaving for the link opens it in the browser
					else if (desktop()) location.assign(message.url);
					else window.open(message.url, '_blank', 'noopener');
				} else if (event === 'signed_in') {
					this.atproto = message;
					return;
				} else if (event === 'error') {
					throw new Error(message.reason);
				}
			}
		} finally {
			this.authorizing = false;
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
