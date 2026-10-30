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

export type Turn = {
	role: 'user' | 'assistant';
	text: string;
	// a live reply's Pi messages and tool runs, gone once the chat is reloaded
	messages?: PiMessage[];
	tools?: Record<string, ToolRun>;
	state?: 'streaming' | 'done' | 'stopped' | 'failed';
	error?: string;
};

const textOf = (content: { type: string; text?: string }[]) =>
	content.flatMap((block) => (block.type === 'text' && block.text ? [block.text] : [])).join('');

// each update carries the whole message so far, so the latest one replaces it
export function apply(turn: Turn, event: Record<string, any>) {
	const message: PiMessage | undefined = event.message;
	switch (event.type) {
		case 'message_start':
			if (message?.role === 'assistant') turn.messages!.push(message);
			break;
		case 'message_update':
		case 'message_end':
			if (message?.role !== 'assistant') break;
			turn.messages![turn.messages!.length - 1] = message;
			turn.text = turn
				.messages!.map((m) => textOf(m.content))
				.filter(Boolean)
				.join('\n\n');
			if (event.type === 'message_end' && message.stopReason === 'error') {
				turn.state = 'failed';
				turn.error = message.errorMessage ?? 'The model stopped with an error';
			}
			break;
		case 'tool_execution_start':
			turn.tools![event.toolCallId] = { done: false, failed: false, output: '' };
			break;
		case 'tool_execution_end':
			turn.tools![event.toolCallId] = {
				done: true,
				failed: !!event.isError,
				output: textOf(event.result?.content ?? [])
			};
			break;
	}
}
