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
	/** Public profile image returned by the daemon; absent on older daemons or profiles without one. */
	avatar?: string | null;
	handle: string;
	did: string;
}

/** Pi's view of itself, from `/agent/state`. */
export interface TilekitSharedSession {
	/** chat.tiles.run link. A private one carries its key in the fragment. */
	url: string;
	is_private: boolean;
}

export interface TilekitModelfile {
	content: string;
	/** false while the shipped modelfile is still in use, nothing has been saved over it */
	edited: boolean;
}

export interface TilekitAgentState {
	sessionId: string;
	model: { id: string; name: string };
	thinkingLevel: string;
	isStreaming: boolean;
}

/** One thing `@name` can reach: a plugin, one of its skills, or a command. */
export interface TilekitMention {
	name: string;
	description: string;
	kind: 'plugin' | 'skill' | 'command';
}

/** A plugin the daemon knows about, shipped with Tiles or installed by the user. */
export interface TilekitPlugin {
	name: string;
	description: string;
	/** ships with Tiles: can be disabled, not uninstalled */
	bundled: boolean;
	enabled: boolean;
}

/**
 * What a plugin change did to the running agent. Pi reads plugins only when it
 * starts, so the daemon reloads it after a change: right away, or once a reply
 * in flight finishes (`deferred`). The model stays loaded either way.
 */
export type TilekitReload = 'done' | 'deferred' | 'not_running' | 'skipped' | 'failed';

/** The answer to any plugin change. */
export interface TilekitPluginChange {
	name: string;
	message: string;
	reload: TilekitReload;
	/** why the agent could not reload; the change itself still stands */
	reload_error?: string;
	/** enable / disable: the state now, and whether this call moved it */
	enabled?: boolean;
	changed?: boolean;
	/** install: targets a spec version whose MCP servers stay off for now */
	mcp_dormant?: boolean;
}
