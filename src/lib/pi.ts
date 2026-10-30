// what Pi streams, as far as the UI reads it
type Block =
	| { type: 'text'; text: string }
	| { type: 'thinking'; thinking: string }
	| { type: 'toolCall'; id: string; name: string; arguments: unknown };

export type PiMessage = {
	role: string;
	content: Block[];
	stopReason?: string;
	errorMessage?: string;
};

export type ToolRun = { done: boolean; failed: boolean; output: string };

// what a streaming reply is doing right now
export type Phase = 'waiting' | 'reasoning' | 'tool' | 'writing';

export type Turn = {
	role: 'user' | 'assistant';
	text: string;
	// Pi messages and tool runs of a live reply, lost on reload
	messages?: PiMessage[];
	tools?: Record<string, ToolRun>;
	phase?: Phase;
	// when the phase began, for the timer
	since?: number;
	// each reasoning block's start and length, by message and block index
	thought?: Record<string, { start: number; ms?: number }>;
	state?: 'streaming' | 'done' | 'stopped' | 'failed';
	error?: string;
};

const textOf = (content: { type: string; text?: string }[]) =>
	content.flatMap((block) => (block.type === 'text' && block.text ? [block.text] : [])).join('');

export const blockKey = (message: number, block: number) => `${message}:${block}`;

function enter(turn: Turn, phase: Phase, now: number) {
	if (turn.phase !== phase) turn.since = now;
	turn.phase = phase;
}

// every update has the whole message so far, the latest one wins
export function apply(turn: Turn, event: Record<string, any>, now = Date.now()) {
	const message: PiMessage | undefined = event.message;
	switch (event.type) {
		case 'message_start':
			if (message?.role !== 'assistant') break;
			turn.messages!.push(message);
			enter(turn, 'waiting', now);
			break;
		case 'message_update':
		case 'message_end': {
			if (message?.role !== 'assistant') break;
			turn.messages![turn.messages!.length - 1] = message;
			const update = event.assistantMessageEvent;
			const key = blockKey(turn.messages!.length - 1, update?.contentIndex);
			if (update?.type === 'thinking_start') {
				(turn.thought ??= {})[key] = { start: now };
				enter(turn, 'reasoning', now);
			} else if (update?.type === 'thinking_end' && turn.thought?.[key]) {
				turn.thought[key].ms = now - turn.thought[key].start;
			} else if (update?.type?.startsWith('text_')) {
				enter(turn, 'writing', now);
			} else if (update?.type?.startsWith('toolcall_')) {
				enter(turn, 'tool', now);
			}
			turn.text = turn
				.messages!.map((m) => textOf(m.content))
				.filter(Boolean)
				.join('\n\n');
			if (event.type === 'message_end' && message.stopReason === 'error') {
				turn.state = 'failed';
				turn.error = message.errorMessage ?? 'The model stopped with an error';
			}
			break;
		}
		case 'tool_execution_start':
			turn.tools![event.toolCallId] = { done: false, failed: false, output: '' };
			enter(turn, 'tool', now);
			break;
		case 'tool_execution_end':
			turn.tools![event.toolCallId] = {
				done: true,
				failed: !!event.isError,
				output: textOf(event.result?.content ?? [])
			};
			// the model reads the result before it goes on
			enter(turn, 'waiting', now);
			break;
	}
}
