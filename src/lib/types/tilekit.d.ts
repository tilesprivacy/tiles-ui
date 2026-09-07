/**
 * Shapes returned by the Tiles daemon under /v1/tilekit.
 *
 * Every handler wraps its payload in TilekitResponse; failures come back as
 * `{ status: 'failed', reason }` with a matching HTTP status.
 */

export interface TilekitResponse<T> {
	status: string;
	data: T;
}

export interface TilekitError {
	status: string;
	reason: string;
}

/** A row from the daemon's `sessions` table. */
export interface TilekitSession {
	id: string;
	name: string;
	created_at: number;
	creator_id: string;
	snapshot: string | null;
}

/**
 * A row from the daemon's `chats` table. Note `context_id` is the parent chat,
 * even though the field is called `parent_chat_id` when saving one.
 */
export interface TilekitChat {
	id: string;
	content: string;
	response_id: string | null;
	role: string;
	user_id: string;
	context_id: string | null;
	created_at: number;
	updated_at: number;
	row_counter: number;
	session_id: string;
	model_name: string;
}

/** What `/session/{id}/chats` returns: the chats plus their owning session. */
export interface TilekitDeltaChat {
	chats: TilekitChat[];
	sessions: TilekitSession[];
}

export interface TilekitSaveChatRequest {
	text: string;
	session_id: string;
	role: string;
	parent_chat_id: string | null;
	user_id: string;
	model_used: string;
}

/** The local account, from `/account/status`. */
export interface TilekitAccount {
	id: string;
	nickname: string;
}

/** An ATproto identity, from `/atproto/status`. Absent means a 404. */
export interface TilekitAtprotoAccount {
	handle: string;
	did: string;
}

/** Pi's view of itself, from `/agent/state`. */
export interface TilekitAgentState {
	sessionId: string;
	model: { id: string; name: string };
	thinkingLevel: string;
	isStreaming: boolean;
}
