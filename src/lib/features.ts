/**
 * Which parts of the UI are switched on.
 *
 * This UI was originally written against llama-server, which exposes a much
 * larger API than Tiles does today. Rather than tear those features out, they
 * are switched off here and the code is left in place, so turning one back on
 * is a matter of flipping the flag and pointing it at the Tilekit endpoint that
 * now backs it. Each flag says what Tiles would need first.
 */
export const FEATURES = {
	/** Multi-turn tool orchestration in the browser. Pi already does this internally. */
	AGENTIC: false,

	ATTACHMENTS_AUDIO: false,

	/** Attachments. `/agent/prompt` takes plain text, so nothing can be sent yet. */
	ATTACHMENTS_IMAGE: false,

	ATTACHMENTS_PDF: false,

	ATTACHMENTS_VIDEO: false,

	/** Editing a message into a new branch. Tilekit stores a parent id but has no branch API. */
	BRANCHING: false,

	/** Context-window gauge. Needs per-request token accounting from the daemon. */
	CONTEXT_GAUGE: false,

	/** Full-text search across conversations. Needs `/session/search`. */
	CONVERSATION_SEARCH: false,

	/** Browser-style tabs above the chat. The sidebar marks the open chat instead. */
	CONVERSATION_TABS: false,

	/** Conversation import/export. Revisit once sessions live on the daemon. */
	IMPORT_EXPORT: false,

	/** Running model-authored JavaScript in a worker. Not wanted for now. */
	JS_SANDBOX: false,

	/** Asking the model to name a conversation. Needs a plain completion endpoint. */
	LLM_TITLES: false,

	/** MCP servers. Pi owns tool access today and does not expose it over HTTP. */
	MCP: false,

	/** Per-message token and timing stats. Same dependency as the gauge. */
	MESSAGE_STATS: false,

	/** Picking and loading models. Needs Tilekit endpoints to list and load models. */
	MODEL_SWITCHING: false,

	/** Sampling and penalty settings. The daemon serves config read-only. */
	SAMPLING_PARAMS: false,

	/** Server capability probe. Tilekit has no `/props` equivalent. */
	SERVER_PROPS: false,
	/** Server-provided tools. Same reason as MCP. */
	SERVER_TOOLS: false,
	/** Deleting a session. `core/chats.rs` has no delete, so there is nothing to call. */
	SESSION_DELETE: false,
	/** Pinning a session. No column for it on the daemon side. */
	SESSION_PIN: false,

	/** Renaming a session. `sessions.name` is only ever written at creation. */
	SESSION_RENAME: false,

	/** Reconnecting to a stream after a refresh. Tilekit streams are not replayable. */
	STREAM_RESUME: false,

	/** Per-conversation working directory, passed to server-side tools. */
	WORKING_DIRECTORY: false
} as const;

/** True when no attachment type is available, used to hide the attach button entirely. */
export const ATTACHMENTS_ENABLED =
	FEATURES.ATTACHMENTS_IMAGE ||
	FEATURES.ATTACHMENTS_AUDIO ||
	FEATURES.ATTACHMENTS_VIDEO ||
	FEATURES.ATTACHMENTS_PDF;
