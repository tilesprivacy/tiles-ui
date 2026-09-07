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
	TilekitAtprotoAccount,
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

	/**
	 * Starts the ATproto OAuth flow. The daemon opens the browser itself and
	 * this request stays open for the whole of it, resolving only once the user
	 * has authorised - so always pass a signal, or a user who walks away leaves
	 * the request hanging.
	 */
	static async atprotoLogin(handle: string, signal?: AbortSignal): Promise<string> {
		return apiPost<TilekitResponse<string>, { user_handle: string }>(
			API_TILEKIT.ATPROTO.LOGIN,
			{ user_handle: handle },
			{ signal }
		).then(unwrap);
	}

	static async atprotoLogout(): Promise<string> {
		return apiPost<TilekitResponse<string>, Record<string, never>>(
			API_TILEKIT.ATPROTO.LOGOUT,
			{}
		).then(unwrap);
	}

	/** The connected ATproto identity, or a 404 when there is none. */
	static async atprotoStatus(): Promise<TilekitAtprotoAccount> {
		return apiFetch<TilekitResponse<TilekitAtprotoAccount>>(API_TILEKIT.ATPROTO.STATUS).then(
			unwrap
		);
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

	/**
	 * Saves one turn against a session, filling in the fields the daemon wants
	 * but the UI does not carry: the local account id, and the model that was
	 * used. The session row is created lazily on the first user turn, so a user
	 * message has to be saved before the reply to it.
	 */
	static async saveTurn(args: {
		sessionId: string;
		text: string;
		role: string;
		parentChatId?: string | null;
		userId: string;
		model?: string;
	}): Promise<TilekitChat> {
		return TilekitService.saveChat({
			model_used: args.model ?? '',
			parent_chat_id: args.parentChatId ?? null,
			role: args.role,
			session_id: args.sessionId,
			text: args.text,
			user_id: args.userId
		});
	}

	/** Starts the Python inference server. */
	static async startServer(): Promise<void> {
		await apiFetch(API_TILEKIT.SERVER.START);
	}
}
