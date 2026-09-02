import { parseTilekitStream, PI_DELTA, PI_EVENT, readMessageDelta } from '$lib/utils/tilekit-sse';
import { describe, expect, it } from 'vitest';

/** Builds a Response whose body streams `chunks` as-is. */
function sseResponse(chunks: string[]): Response {
	const encoder = new TextEncoder();
	const body = new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		}
	});

	return new Response(body);
}

function frame(event: string, data: string): string {
	return `event: ${event}\ndata: ${data}\n\n`;
}

async function collect(response: Response) {
	const events = [];

	for await (const event of parseTilekitStream(response)) events.push(event);

	return events;
}

describe('parseTilekitStream', () => {
	it('reads the event name alongside the payload', async () => {
		const events = await collect(
			sseResponse([frame('agent_start', '{"type":"agent_start"}'), frame('agent_settled', '{}')])
		);

		expect(events.map((e) => e.event)).toEqual(['agent_start', PI_EVENT.AGENT_SETTLED]);
		expect(events[0].data).toBe('{"type":"agent_start"}');
	});

	it('stops once the agent settles', async () => {
		const events = await collect(
			sseResponse([frame('agent_settled', '{}'), frame('agent_start', '{}')])
		);

		expect(events).toHaveLength(1);
	});

	it('handles a record split across reads', async () => {
		const events = await collect(sseResponse(['event: agent_st', 'art\ndata: {"a":1}\n\n']));

		expect(events).toEqual([{ data: '{"a":1}', event: 'agent_start' }]);
	});

	it('surfaces in-band errors as events', async () => {
		const events = await collect(sseResponse([frame('error', 'agent not started')]));

		expect(events[0]).toEqual({ data: 'agent not started', event: PI_EVENT.ERROR });
	});
});

describe('readMessageDelta', () => {
	it('pulls out a text delta', () => {
		const data = JSON.stringify({
			assistantMessageEvent: { delta: 'Hello', type: 'text_delta' },
			type: 'message_update'
		});

		expect(readMessageDelta(data)).toEqual({ delta: 'Hello', kind: PI_DELTA.TEXT });
	});

	it('pulls out a thinking delta', () => {
		const data = JSON.stringify({
			assistantMessageEvent: { delta: 'hmm', type: 'thinking_delta' }
		});

		expect(readMessageDelta(data)).toEqual({ delta: 'hmm', kind: PI_DELTA.THINKING });
	});

	it('ignores the start and end bookends, which carry no delta', () => {
		expect(
			readMessageDelta(JSON.stringify({ assistantMessageEvent: { type: 'text_start' } }))
		).toBe(null);
	});

	it('ignores malformed json rather than throwing', () => {
		expect(readMessageDelta('not json')).toBe(null);
	});
});
