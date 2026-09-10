/**
 * Tilekit, the HTTP surface the Tiles daemon exposes on port 1729.
 *
 * Everything else in this file predates the move off llama-server and is only
 * still reachable through features that are switched off in $lib/features.
 */
const TILEKIT = '/v1/tilekit';

export const API_TILEKIT = {
	ACCOUNT: {
		CREATE: `${TILEKIT}/account/create`,
		STATUS: `${TILEKIT}/account/status`
	},
	AGENT: {
		COMMANDS: `${TILEKIT}/agent/commands`,
		END_SESSION: `${TILEKIT}/agent/end_session`,
		PROMPT: `${TILEKIT}/agent/prompt`,
		RELOAD: `${TILEKIT}/agent/reload`,
		START: `${TILEKIT}/agent/start`,
		STATE: `${TILEKIT}/agent/state`
	},
	ATPROTO: {
		LOGIN: `${TILEKIT}/atproto/login`,
		LOGOUT: `${TILEKIT}/atproto/logout`,
		shareSession: (sessionId: string) =>
			`${TILEKIT}/atproto/share-session/${encodeURIComponent(sessionId)}`,
		STATUS: `${TILEKIT}/atproto/status`
	},
	MODELFILE: `${TILEKIT}/modelfile`,
	SERVER: {
		PING: `${TILEKIT}/server/ping`,
		START: `${TILEKIT}/server/start`,
		STOP: `${TILEKIT}/server/stop`
	},
	SESSION: {
		CHAT: `${TILEKIT}/session/chat`,
		chats: (sessionId: string) => `${TILEKIT}/session/${encodeURIComponent(sessionId)}/chats`,
		LIST: `${TILEKIT}/session/list`,
		NEW: `${TILEKIT}/session/new`
	}
} as const;

export const API_MODELS = {
	LIST: '/v1/models',
	LOAD: '/models/load',
	SSE: '/models/sse',
	UNLOAD: '/models/unload'
};

// chat completion routes, the control route drives realtime inference (e.g. end reasoning)
export const API_CHAT = {
	COMPLETIONS: '/v1/chat/completions',
	CONTROL: '/v1/chat/completions/control'
};

// slot introspection, requires the --slots flag on the server
export const API_SLOTS = {
	LIST: '/slots'
};

export const API_TOOLS = {
	EXECUTE: '/tools',
	LIST: '/tools'
};

// resumable stream routes, the conv::model identity travels as the conv_id query param
// because model names can contain slashes that a path segment cannot carry
// resume retry cadence while the owning model is still loading (server answers 503)
export const STREAM_RESUME_RETRY_MS = 2000;

export const API_STREAM = {
	BASE: '/v1/stream',
	LOOKUP: '/v1/streams/lookup'
};

// query params for the resumable stream routes
export const STREAM_QUERY_PARAMS = {
	CONV_ID: 'conv_id',
	FROM: 'from'
} as const;

/** CORS proxy endpoint path */
export const CORS_PROXY_ENDPOINT = '/cors-proxy';
