/**
 * TilekitService - talks to the Tiles daemon's /v1/tilekit routes.
 *
 * Sessions and chats live in the daemon's SQLite database, so this is the
 * source of truth for conversation history rather than the browser. The
 * daemon wraps every payload in `{ status, data }`; `unwrap` peels that off.
 */

import { API_TILEKIT } from '$lib/constants';
import type {
	TilekitAccount,
	TilekitAgentState,
	TilekitChat,
	TilekitDeltaChat,
	TilekitResponse,
	TilekitSaveChatRequest,
	TilekitSession
} from '$lib/types/tilekit';
import { apiFetch, apiPost } from '$lib/utils';

function unwrap<T>(response: TilekitResponse<T>): T {
	return response.data;
}

export class TilekitService {
	/** The local account. Its id is the `user_id` every saved chat needs. */
	static async accountStatus(): Promise<TilekitAccount> {
		return apiFetch<TilekitResponse<TilekitAccount>>(API_TILEKIT.ACCOUNT.STATUS).then(unwrap);
	}

	/** Pi's current session id, model and thinking level. */
	static async agentState(): Promise<TilekitAgentState> {
		return apiFetch<TilekitResponse<TilekitAgentState>>(API_TILEKIT.AGENT.STATE).then(unwrap);
	}

	/** Creates the local identity. Fails with 409 if one already exists. */
	static async createAccount(nickname: string): Promise<TilekitAccount> {
		return apiPost<TilekitResponse<TilekitAccount>, { nickname: string }>(
			API_TILEKIT.ACCOUNT.CREATE,
			{ nickname }
		).then(unwrap);
	}

	/** Asks Pi to abort the turn it is working on. */
	static async endAgentSession(): Promise<void> {
		await apiFetch(API_TILEKIT.AGENT.END_SESSION);
	}

	/** Chats belonging to one session, oldest first. */
	static async fetchChats(sessionId: string): Promise<TilekitChat[]> {
		const delta = await apiFetch<TilekitResponse<TilekitDeltaChat>>(
			API_TILEKIT.SESSION.chats(sessionId)
		).then(unwrap);

		return delta.chats;
	}

	/** Every session the daemon knows about, newest first. */
	static async listSessions(): Promise<TilekitSession[]> {
		return apiFetch<TilekitResponse<TilekitSession[]>>(API_TILEKIT.SESSION.LIST).then(unwrap);
	}

	/**
	 * Starts a new Pi session and returns its id. Also starts the agent if it
	 * is not running yet.
	 */
	static async newSession(): Promise<string> {
		const session = await apiPost<TilekitResponse<{ id: string }>, Record<string, never>>(
			API_TILEKIT.SESSION.NEW,
			{}
		).then(unwrap);

		return session.id;
	}

	/** Is the inference server up? */
	static async pingServer(): Promise<boolean> {
		try {
			await apiFetch(API_TILEKIT.SERVER.PING);

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Persists one turn. The session row is created lazily on the first message,
	 * and only for a user turn, so the user message must be saved before the
	 * assistant reply.
	 */
	static async saveChat(request: TilekitSaveChatRequest): Promise<TilekitChat> {
		return apiPost<TilekitResponse<TilekitChat>, TilekitSaveChatRequest>(
			API_TILEKIT.SESSION.CHAT,
			request
		).then(unwrap);
	}

	/** Starts the Python inference server. */
	static async startServer(): Promise<void> {
		await apiFetch(API_TILEKIT.SERVER.START);
	}
}
