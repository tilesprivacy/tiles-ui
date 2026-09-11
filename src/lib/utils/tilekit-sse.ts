import { splitSseRecords } from './sse';
import { SSE_DATA_PREFIX, SSE_LINE_SEPARATOR, SSE_RECORD_SEPARATOR } from '$lib/constants';

/**
 * Reader for the stream `/v1/tilekit/agent/prompt` returns.
 *
 * Unlike the OpenAI-style streams the rest of this app was built for, the
 * daemon names each event after the Pi event it carries (`event: message_update`)
 * and puts Pi's raw JSON line in `data`. So we need the event name, which the
 * plain JSON reader in sse.ts throws away.
 *
 * Note that failures arrive in-band as an `error` event on an otherwise
 * successful response - the daemon has already sent its headers by then.
 */

export const PI_EVENT = {
	AGENT_SETTLED: 'agent_settled',
	ERROR: 'error',
	MENTION: 'mention',
	MESSAGE_END: 'message_end',
	MESSAGE_UPDATE: 'message_update',
	TOOL_EXECUTION_END: 'tool_execution_end',
	TOOL_EXECUTION_START: 'tool_execution_start',
	TOOL_EXECUTION_UPDATE: 'tool_execution_update'
} as const;

export const PI_DELTA = {
	TEXT: 'text_delta',
	THINKING: 'thinking_delta',
	TOOLCALL: 'toolcall_delta'
} as const;

export interface PiSseEvent {
	event: string;
	data: string;
}

/** The `message_end` payload. A failed turn is reported here, not as an `error`. */
export interface PiMessageEnd {
	message?: {
		errorMessage?: string;
		stopReason?: string;
	};
}

/** The `message_update` payload, as Pi writes it. */
export interface PiMessageUpdate {
	assistantMessageEvent?: {
		type?: string;
		delta?: string;
	};
}

/**
 * A `mention` event: the daemon answered `@name` itself, no model turn ran.
 * `describe` is a bare `@plugin`, `unknown` is a name nothing matched.
 */
export interface PiMention {
	resolved: 'describe' | 'unknown';
	name: string;
	description?: string;
	available?: string[];
}

/**
 * A `tool_execution_*` event. Start and update carry `args`/`partialResult`,
 * end carries `result`. `partialResult` is cumulative, so each update
 * replaces the last rather than appending.
 */
export interface PiToolExecution {
	toolCallId?: string;
	toolName?: string;
	args?: unknown;
	partialResult?: unknown;
	result?: unknown;
	isError?: boolean;
}

/** Pulls the event name and data payload out of one SSE record. */
function parseRecord(record: string): PiSseEvent | null {
	let event = '';

	const dataLines: string[] = [];

	for (const line of record.split(SSE_LINE_SEPARATOR)) {
		if (line.startsWith('event:')) {
			event = line.slice('event:'.length).trim();
		} else if (line.startsWith(SSE_DATA_PREFIX)) {
			dataLines.push(line.slice(SSE_DATA_PREFIX.length).trim());
		}
	}

	if (!event && dataLines.length === 0) return null;

	return { data: dataLines.join(SSE_LINE_SEPARATOR), event };
}

/** Yields each event until Pi settles or the caller aborts. */
export async function* parseTilekitStream(
	response: Response,
	signal?: AbortSignal
): AsyncGenerator<PiSseEvent> {
	const reader = response.body?.getReader();

	if (!reader) return;

	const decoder = new TextDecoder();

	let buffer = '';

	try {
		while (true) {
			if (signal?.aborted) return;

			const { done, value } = await reader.read();

			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const { records, rest } = splitSseRecords(buffer);

			buffer = rest;

			for (const record of records) {
				if (!record.trim()) continue;

				const parsed = parseRecord(record);

				if (!parsed) continue;

				yield parsed;

				if (parsed.event === PI_EVENT.AGENT_SETTLED) return;
			}
		}

		// a stream that ends without a blank line leaves one record behind
		if (buffer.trim()) {
			const parsed = parseRecord(buffer);

			if (parsed) yield parsed;
		}
	} finally {
		try {
			reader.releaseLock();
		} catch (error) {
			console.error('[tilekit-sse] failed to release reader lock:', error);
		}
	}
}

/**
 * Reads the delta out of a `message_update` event. Returns null for the
 * start/end bookends, which carry no text.
 */
export function readMessageDelta(data: string): { kind: string; delta: string } | null {
	let parsed: PiMessageUpdate;

	try {
		parsed = JSON.parse(data) as PiMessageUpdate;
	} catch {
		return null;
	}

	const event = parsed.assistantMessageEvent;

	if (!event?.type || typeof event.delta !== 'string') return null;

	return { delta: event.delta, kind: event.type };
}

/**
 * Reads a failed turn out of a `message_end` event. Pi answers 200 and streams a
 * normal looking message whose stopReason is `error`, so without this a dead
 * inference server arrives as nothing more than an empty reply.
 */
export function readTurnFailure(data: string): string | null {
	let parsed: PiMessageEnd;

	try {
		parsed = JSON.parse(data) as PiMessageEnd;
	} catch {
		return null;
	}

	if (parsed.message?.stopReason !== 'error') return null;

	return parsed.message.errorMessage || 'The agent could not finish the turn';
}

/** Reads a `mention` event, or null when the payload is not one. */
export function readMention(data: string): PiMention | null {
	let parsed: PiMention;

	try {
		parsed = JSON.parse(data) as PiMention;
	} catch {
		return null;
	}

	if (parsed.resolved !== 'describe' && parsed.resolved !== 'unknown') return null;

	return parsed;
}

/**
 * The text of a tool result. Pi results are MCP-shaped - `content` blocks
 * with `text` - so join those; anything else is shown as its JSON.
 */
export function toolResultText(result: unknown): string {
	if (typeof result === 'string') return result;

	if (result && typeof result === 'object' && 'content' in result) {
		const blocks = (result as { content?: unknown }).content;

		if (Array.isArray(blocks)) {
			const text = blocks
				.map((block) => (block && typeof block.text === 'string' ? block.text : ''))
				.filter(Boolean)
				.join('\n');

			if (text) return text;
		}
	}

	return result === undefined || result === null ? '' : JSON.stringify(result, null, 2);
}

/** Reads a `tool_execution_*` event, or null when it names no tool call. */
export function readToolExecution(data: string): PiToolExecution | null {
	let parsed: PiToolExecution;

	try {
		parsed = JSON.parse(data) as PiToolExecution;
	} catch {
		return null;
	}

	if (!parsed.toolCallId || !parsed.toolName) return null;

	return parsed;
}

export { SSE_RECORD_SEPARATOR };
