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

const textOfTurn = (turn: Turn) =>
	turn
		.messages!.map((m) => textOf(m.content))
		.filter(Boolean)
		.join('\n\n');

function enter(turn: Turn, phase: Phase, now: number) {
	if (turn.phase !== phase) turn.since = now;
	turn.phase = phase;
}

// a block as its delta builds it
function grow(message: PiMessage, update: Record<string, any>) {
	const at = update.contentIndex;
	const block = message.content[at];
	switch (update.type) {
		case 'thinking_start':
			message.content[at] = { type: 'thinking', thinking: '' };
			break;
		case 'thinking_delta':
			if (block?.type === 'thinking') block.thinking += update.delta ?? '';
			break;
		case 'thinking_end':
			if (block?.type === 'thinking') block.thinking = update.content ?? block.thinking;
			break;
		case 'text_start':
			message.content[at] = { type: 'text', text: '' };
			break;
		case 'text_delta':
			if (block?.type === 'text') block.text += update.delta ?? '';
			break;
		case 'text_end':
			if (block?.type === 'text') block.text = update.content ?? block.text;
			break;
		case 'toolcall_start':
			message.content[at] = { type: 'toolCall', id: '', name: '', arguments: {} };
			break;
		case 'toolcall_end':
			if (update.toolCall) message.content[at] = update.toolCall;
			break;
	}
}

// updates carry only deltas, built up between message_start and message_end.
// message_end has the whole message and wins
export function apply(turn: Turn, event: Record<string, any>, now = Date.now()) {
	const message: PiMessage | undefined = event.message;
	switch (event.type) {
		case 'message_start':
			if (message?.role !== 'assistant') break;
			turn.messages!.push({ ...message, content: [...message.content] });
			enter(turn, 'waiting', now);
			break;
		case 'message_update': {
			const last = turn.messages!.at(-1);
			const update = event.assistantMessageEvent;
			if (!last || !update) break;
			grow(last, update);
			const key = blockKey(turn.messages!.length - 1, update.contentIndex);
			if (update.type === 'thinking_start') {
				(turn.thought ??= {})[key] = { start: now };
				enter(turn, 'reasoning', now);
			} else if (update.type === 'thinking_end' && turn.thought?.[key]) {
				turn.thought[key].ms = now - turn.thought[key].start;
			} else if (update.type.startsWith('text_')) {
				enter(turn, 'writing', now);
			} else if (update.type.startsWith('toolcall_')) {
				enter(turn, 'tool', now);
			}
			turn.text = textOfTurn(turn);
			break;
		}
		case 'message_end':
			if (message?.role !== 'assistant') break;
			turn.messages![turn.messages!.length - 1] = message;
			turn.text = textOfTurn(turn);
			if (message.stopReason === 'error') {
				turn.state = 'failed';
				turn.error = message.errorMessage ?? 'The model stopped with an error';
			}
			break;
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
