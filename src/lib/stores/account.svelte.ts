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
import type { TilekitAccount } from '$lib/types/tilekit';
import { ApiError } from '$lib/utils';

export type AccountState = 'loading' | 'missing' | 'ready' | 'unreachable';

class AccountStore {
	account = $state<TilekitAccount | null>(null);
	creating = $state(false);
	error = $state<string | null>(null);
	state = $state<AccountState>('loading');

	/** Shortened did:key for places that cannot fit the whole thing. */
	get shortDid(): string {
		const id = this.account?.id;

		if (!id) return '';

		return id.length > 24 ? `${id.slice(0, 16)}…${id.slice(-6)}` : id;
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

	async initialize(): Promise<void> {
		if (!browser) return;

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
}

export const accountStore = new AccountStore();
