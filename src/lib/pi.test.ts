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

test('a reply follows the latest message, tools and all', () => {
	const turn = reply();
	const call = { type: 'toolCall', id: 'call_1', name: 'bash', arguments: { command: 'ls' } };
	for (const event of [
		{ type: 'message_start', message: { role: 'user', content: [{ type: 'text', text: 'hi' }] } },
		{ type: 'message_start', message: assistant() },
		{ type: 'message_update', message: assistant({ type: 'thinking', thinking: 'hmm' }) },
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
		{ type: 'message_update', message: assistant({ type: 'text', text: 'One file' }) }
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
	const update = (type: string, ...content: unknown[]) => ({
		type: 'message_update',
		message: assistant(...content),
		assistantMessageEvent: { type, contentIndex: 0 }
	});
	apply(turn, { type: 'message_start', message: assistant() }, 1000);
	expect(turn.phase).toBe('waiting');
	apply(turn, update('thinking_start', { type: 'thinking', thinking: '' }), 2000);
	expect(turn).toMatchObject({ phase: 'reasoning', since: 2000 });
	apply(turn, update('thinking_end', { type: 'thinking', thinking: 'hmm' }), 6500);
	expect(turn.thought).toEqual({ '0:0': { start: 2000, ms: 4500 } });
	apply(turn, update('text_delta', { type: 'text', text: 'Hi' }), 7000);
	expect(turn).toMatchObject({ phase: 'writing', since: 7000 });
	apply(turn, { type: 'tool_execution_start', toolCallId: 'c' }, 8000);
	expect(turn.phase).toBe('tool');
	apply(turn, { type: 'tool_execution_end', toolCallId: 'c', result: { content: [] } }, 9000);
	expect(turn).toMatchObject({ phase: 'waiting', since: 9000 });
});
