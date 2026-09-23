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
	TilekitDownloadProgress,
	TilekitMention,
	TilekitModelfile,
	TilekitModelSelected,
	TilekitModelStatus,
	TilekitPlugin,
	TilekitPluginChange,
	TilekitResponse,
	TilekitSaveChatRequest,
	TilekitSession,
	TilekitSharedSession
} from '$lib/types/tilekit';
import { apiFetch, apiPost, parseSseJsonStream } from '$lib/utils';
import { API_ORIGIN } from '$lib/utils/api-origin';

function unwrap<T>(response: TilekitResponse<T>): T {
	return response.data;
}

export class TilekitService {
	/** The local account. Its id is the `user_id` every saved chat needs. */
	static async accountStatus(): Promise<TilekitAccount> {
		return apiFetch<TilekitResponse<TilekitAccount>>(API_TILEKIT.ACCOUNT.STATUS).then(unwrap);
	}

	/**
	 * Everything `@name` can reach: plugins, their skills, and plugin commands.
	 * The daemon resolves the mention on submit; this list only feeds the picker.
	 */
	static async agentMentions(): Promise<TilekitMention[]> {
		return apiFetch<TilekitResponse<{ mentions: TilekitMention[] }>>(API_TILEKIT.AGENT.COMMANDS)
			.then(unwrap)
			.then((data) => data.mentions);
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

	/** Stops the download; what arrived stays and a later download continues. */
	static async cancelDownload(): Promise<TilekitDownloadProgress> {
		return apiFetch<TilekitResponse<TilekitDownloadProgress>>(API_TILEKIT.MODEL.DOWNLOAD, {
			method: 'DELETE'
		}).then(unwrap);
	}

	/** Creates the local identity. Fails with 409 if one already exists. */
	static async createAccount(nickname: string): Promise<TilekitAccount> {
		return apiPost<TilekitResponse<TilekitAccount>, { nickname: string }>(
			API_TILEKIT.ACCOUNT.CREATE,
			{ nickname }
		).then(unwrap);
	}

	/**
	 * The scrubbed tail of the daemon and inference logs, for error reports.
	 * Best-effort by design: a report without context beats no report.
	 */
	static async diagnosticsLogs(): Promise<string[]> {
		try {
			const data = await apiFetch<TilekitResponse<{ lines: string[] }>>(
				API_TILEKIT.DIAGNOSTICS.LOGS
			).then(unwrap);

			return data.lines;
		} catch {
			return [];
		}
	}

	/**
	 * Starts downloading `spec`, or joins the download already running for
	 * it, yielding progress until it is done, cancelled or failed. One
	 * download runs at a time; another model is refused.
	 */
	static async *downloadModel(
		spec: string,
		signal?: AbortSignal
	): AsyncGenerator<TilekitDownloadProgress> {
		const response = await fetch(`${API_ORIGIN}${API_TILEKIT.MODEL.DOWNLOAD}`, {
			body: JSON.stringify({ spec }),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST',
			signal
		});

		if (!response.ok) {
			const body = await response.json().catch(() => null);

			throw new Error(body?.reason ?? `The download could not start (${response.status})`);
		}

		for await (const event of parseSseJsonStream<TilekitDownloadProgress>(response, signal)) {
			yield event.data;
		}
	}

	/** The running or last download, for a page that was not watching it. */
	static async downloadState(): Promise<TilekitDownloadProgress | null> {
		return apiFetch<TilekitResponse<TilekitDownloadProgress | null>>(
			API_TILEKIT.MODEL.DOWNLOAD
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

	/**
	 * Installs from a url, a plugin folder or an archive on the daemon's
	 * machine. Resolves only once it is unpacked and copied, with no progress
	 * in between.
	 */
	static async installPlugin(source: string): Promise<TilekitPluginChange> {
		return apiPost<TilekitResponse<TilekitPluginChange>, { source: string }>(
			API_TILEKIT.PLUGIN.INSTALL,
			{ source }
		).then(unwrap);
	}

	/** Every plugin, bundled and installed, with its on/off state. */
	static async listPlugins(): Promise<TilekitPlugin[]> {
		return apiFetch<TilekitResponse<TilekitPlugin[]>>(API_TILEKIT.PLUGIN.LIST).then(unwrap);
	}

	/** Every session the daemon knows about, newest first. */
	static async listSessions(): Promise<TilekitSession[]> {
		return apiFetch<TilekitResponse<TilekitSession[]>>(API_TILEKIT.SESSION.LIST).then(unwrap);
	}

	/**
	 * Starts a new Pi session and returns its id. Also starts the agent if it
	 * is not running yet.
	 */
	/** The modelfile the agent starts from, edited or as shipped. */
	static async modelfile(): Promise<TilekitModelfile> {
		return apiFetch<TilekitResponse<TilekitModelfile>>(API_TILEKIT.MODELFILE).then(unwrap);
	}

	/**
	 * The models onboarding offers, how much of each is downloaded, and which
	 * fits this machine. The first call after a cold start is slow: it starts
	 * the inference server and reads each model's header once.
	 */
	static async modelStatus(): Promise<TilekitModelStatus> {
		return apiFetch<TilekitResponse<TilekitModelStatus>>(API_TILEKIT.MODEL.STATUS).then(unwrap);
	}

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
	/**
	 * Replaces the running agent with one started from the current modelfile.
	 * Pi is respawned, so this takes a moment and drops the live session.
	 */
	static async reloadAgent(): Promise<void> {
		await apiFetch(API_TILEKIT.AGENT.RELOAD);
	}

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
	/**
	 * Saves the modelfile. The daemon parses it first and rejects one it cannot
	 * read, so a failure here means the text is bad, not that the write failed.
	 * Takes effect on the next `reloadAgent`.
	 */
	static async saveModelfile(content: string): Promise<TilekitModelfile> {
		return apiFetch<TilekitResponse<TilekitModelfile>>(API_TILEKIT.MODELFILE, {
			body: JSON.stringify({ content }),
			method: 'PUT'
		}).then(unwrap);
	}

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

	/**
	 * Makes a downloaded model the one Tiles runs. Refused with a 409 when the
	 * user's modelfile has edits of their own, unless `replaceEdited`.
	 */
	static async selectModel(id: string, replaceEdited = false): Promise<TilekitModelSelected> {
		return apiPost<TilekitResponse<TilekitModelSelected>, { id: string; replace_edited: boolean }>(
			API_TILEKIT.MODEL.SELECT,
			{ id, replace_edited: replaceEdited }
		).then(unwrap);
	}

	static async setPluginEnabled(name: string, enabled: boolean): Promise<TilekitPluginChange> {
		const path = enabled ? API_TILEKIT.PLUGIN.enable(name) : API_TILEKIT.PLUGIN.disable(name);

		return apiFetch<TilekitResponse<TilekitPluginChange>>(path, { method: 'POST' }).then(unwrap);
	}

	/** Starts Pi if it is not already running. */
	/**
	 * Publishes a session to the user's ATmosphere PDS and returns the link.
	 * A private share is encrypted first and the key rides in the URL fragment,
	 * so it never reaches the PDS. Needs an ATproto login.
	 */
	static async shareSession(sessionId: string, isPrivate: boolean): Promise<TilekitSharedSession> {
		return apiPost<TilekitResponse<TilekitSharedSession>, { is_private: boolean }>(
			API_TILEKIT.ATPROTO.shareSession(sessionId),
			{ is_private: isPrivate }
		).then(unwrap);
	}

	static async startAgent(): Promise<void> {
		await apiFetch(API_TILEKIT.AGENT.START);
	}

	/** Starts the Python inference server. */
	static async startServer(): Promise<void> {
		await apiFetch(API_TILEKIT.SERVER.START);
	}

	static async uninstallPlugin(name: string): Promise<TilekitPluginChange> {
		return apiFetch<TilekitResponse<TilekitPluginChange>>(API_TILEKIT.PLUGIN.remove(name), {
			method: 'DELETE'
		}).then(unwrap);
	}
}
