import { expect, test } from 'vitest';
import { apply, type Turn } from './pi.ts';

const reply = (): Turn => ({
	role: 'assistant',
	text: '',
	messages: [],
	tools: {},
	state: 'streaming'
});
const assistant = (...content: unknown[]) => ({ role: 'assistant', content });
// Pi's updates carry only the delta
const update = (type: string, contentIndex: number, more: object = {}) => ({
	type: 'message_update',
	assistantMessageEvent: { type, contentIndex, ...more }
});

test('a reply follows the latest message, tools and all', () => {
	const turn = reply();
	const call = { type: 'toolCall', id: 'call_1', name: 'bash', arguments: { command: 'ls' } };
	for (const event of [
		{ type: 'message_start', message: { role: 'user', content: [{ type: 'text', text: 'hi' }] } },
		{ type: 'message_start', message: assistant() },
		update('thinking_start', 0),
		update('thinking_delta', 0, { delta: 'hmm' }),
		{ type: 'message_end', message: assistant({ type: 'thinking', thinking: 'hmm' }, call) },
		{ type: 'tool_execution_start', toolCallId: 'call_1' },
		{
			type: 'tool_execution_end',
			toolCallId: 'call_1',
			isError: false,
			result: { content: [{ type: 'text', text: 'a.txt' }] }
		},
		{ type: 'message_start', message: { role: 'toolResult', content: [] } },
		{ type: 'message_start', message: assistant() },
		update('text_start', 0),
		update('text_delta', 0, { delta: 'One ' }),
		update('text_delta', 0, { delta: 'file' })
	]) {
		apply(turn, event);
	}
	expect(turn.messages).toHaveLength(2);
	expect(turn.tools).toEqual({ call_1: { done: true, failed: false, output: 'a.txt' } });
	expect(turn.text).toBe('One file');
	expect(turn.state).toBe('streaming');
});

test('a model error fails the reply with its message', () => {
	const turn = reply();
	apply(turn, { type: 'message_start', message: assistant() });
	apply(turn, {
		type: 'message_end',
		message: { ...assistant(), stopReason: 'error', errorMessage: 'stream ended early' }
	});
	expect(turn).toMatchObject({ state: 'failed', error: 'stream ended early' });
});

test('a reply says what it is doing, and how long it reasoned', () => {
	const turn = reply();
	apply(turn, { type: 'message_start', message: assistant() }, 1000);
	expect(turn.phase).toBe('waiting');
	apply(turn, update('thinking_start', 0), 2000);
	expect(turn).toMatchObject({ phase: 'reasoning', since: 2000 });
	apply(turn, update('thinking_end', 0, { content: 'hmm' }), 6500);
	expect(turn.thought).toEqual({ '0:0': { start: 2000, ms: 4500 } });
	apply(turn, update('text_start', 1), 7000);
	expect(turn).toMatchObject({ phase: 'writing', since: 7000 });
	apply(turn, { type: 'tool_execution_start', toolCallId: 'c' }, 8000);
	expect(turn.phase).toBe('tool');
	apply(turn, { type: 'tool_execution_end', toolCallId: 'c', result: { content: [] } }, 9000);
	expect(turn).toMatchObject({ phase: 'waiting', since: 9000 });
});

test('reasoning and text build up from their deltas while they stream', () => {
	const turn = reply();
	apply(turn, { type: 'message_start', message: assistant() });
	apply(turn, update('thinking_start', 0));
	apply(turn, update('thinking_delta', 0, { delta: 'Is 91 ' }));
	apply(turn, update('thinking_delta', 0, { delta: 'prime?' }));
	expect(turn.messages![0].content[0]).toEqual({ type: 'thinking', thinking: 'Is 91 prime?' });
	apply(turn, update('text_start', 1));
	apply(turn, update('text_delta', 1, { delta: 'No, 7 × 13' }));
	expect(turn.text).toBe('No, 7 × 13');
	// the end of the message is the whole of it
	apply(turn, { type: 'message_end', message: assistant({ type: 'text', text: 'No, 7 × 13.' }) });
	expect(turn.text).toBe('No, 7 × 13.');
});
