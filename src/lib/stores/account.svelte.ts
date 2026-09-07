/**
 * accountStore - the local Tiles identity.
 *
 * Tiles gives every install a local account: an Ed25519 keypair in the OS
 * keychain, named by a `did:key`. It is created once, before anything else
 * works, which is why a missing account puts the app into onboarding rather
 * than into an error.
 *
 * An ATproto identity is separate and optional; the daemon does not expose it
 * over HTTP yet, so nothing here touches it.
 */

import { browser } from '$app/environment';
import { TilekitService } from '$lib/services/tilekit.service';
import type { TilekitAccount, TilekitAtprotoAccount } from '$lib/types/tilekit';
import { ApiError } from '$lib/utils';

export type AccountState = 'loading' | 'missing' | 'ready' | 'unreachable';

/**
 * `connecting` covers the whole browser round trip. The daemon opens the
 * browser and holds the request open until the user authorises, so this can
 * last minutes and has to be cancellable.
 */
export type AtprotoState = 'loading' | 'absent' | 'connecting' | 'ready';

class AccountStore {
	account = $state<TilekitAccount | null>(null);
	atproto = $state<TilekitAtprotoAccount | null>(null);

	atprotoError = $state<string | null>(null);
	atprotoState = $state<AtprotoState>('loading');
	creating = $state(false);
	error = $state<string | null>(null);
	state = $state<AccountState>('loading');
	private connectAbort: AbortController | null = null;

	/** Shortened did:key for places that cannot fit the whole thing. */
	get shortDid(): string {
		const id = this.account?.id;

		if (!id) return '';

		return id.length > 24 ? `${id.slice(0, 16)}…${id.slice(-6)}` : id;
	}

	/**
	 * Gives up on this side only. The daemon keeps its callback listener open,
	 * so finishing in the browser afterwards still signs you in - a refresh
	 * will show it.
	 */
	cancelConnect(): void {
		this.connectAbort?.abort();
		this.connectAbort = null;
		this.atprotoState = 'absent';
		this.atprotoError = null;
	}

	/**
	 * Resolves the handle, hands off to the browser, and waits. Resolves true
	 * once the daemon confirms; false if it failed or the user cancelled.
	 */
	async connectAtproto(handle: string): Promise<boolean> {
		const trimmed = handle.trim().replace(/^@/, '');

		if (!trimmed || this.atprotoState === 'connecting') return false;

		this.connectAbort = new AbortController();
		this.atprotoState = 'connecting';
		this.atprotoError = null;

		try {
			await TilekitService.atprotoLogin(trimmed, this.connectAbort.signal);
			await this.refreshAtproto();

			return this.atproto !== null;
		} catch (error) {
			if (this.connectAbort?.signal.aborted) {
				this.atprotoState = 'absent';

				return false;
			}

			this.atprotoError = error instanceof Error ? error.message : String(error);
			this.atprotoState = 'absent';

			return false;
		} finally {
			this.connectAbort = null;
		}
	}

	async create(nickname: string): Promise<boolean> {
		const trimmed = nickname.trim();

		if (!trimmed || this.creating) return false;

		this.creating = true;
		this.error = null;

		try {
			this.account = await TilekitService.createAccount(trimmed);
			this.state = 'ready';

			return true;
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);

			return false;
		} finally {
			this.creating = false;
		}
	}

	async disconnectAtproto(): Promise<void> {
		this.atprotoError = null;

		try {
			await TilekitService.atprotoLogout();
		} catch (error) {
			this.atprotoError = error instanceof Error ? error.message : String(error);
		}

		await this.refreshAtproto();
	}

	async initialize(): Promise<void> {
		if (!browser) return;

		void this.refreshAtproto();

		try {
			this.account = await TilekitService.accountStatus();
			this.state = 'ready';
			this.error = null;
		} catch (error) {
			// the daemon answers 404 until an account exists - that is onboarding,
			// not a failure
			if (error instanceof ApiError && error.status === 404) {
				this.account = null;
				this.state = 'missing';

				return;
			}

			this.state = 'unreachable';
			this.error = error instanceof Error ? error.message : String(error);
		}
	}

	async refreshAtproto(): Promise<void> {
		try {
			this.atproto = await TilekitService.atprotoStatus();
			this.atprotoState = 'ready';
		} catch {
			// 404 simply means no account is connected
			this.atproto = null;
			this.atprotoState = 'absent';
		}
	}
}

export const accountStore = new AccountStore();
