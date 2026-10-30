import { afterEach, expect, test, vi } from 'vitest';
import { ApiError, api, stream } from './api.ts';

afterEach(() => vi.unstubAllGlobals());

function serve(...chunks: string[]) {
	const body = new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
			controller.close();
		}
	});
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(body))
	);
}

async function collect(path = 'x') {
	const events = [];
	for await (const event of stream(path)) events.push(event);
	return events;
}

test('events split across chunks come out whole', async () => {
	serve('event: state\nda', 'ta: {"a":1}\n\n: keep-alive\n\nevent: state\r\ndata: 2\r\n\r\n');
	expect(await collect()).toEqual([
		{ event: 'state', data: '{"a":1}' },
		{ event: 'state', data: '2' }
	]);
});

test('an unnamed event is a message and its data lines join', async () => {
	serve('data: one\ndata: two\n\n');
	expect(await collect()).toEqual([{ event: 'message', data: 'one\ntwo' }]);
});

test('a failure carries the status and the reason', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => Response.json({ status: 'failed', reason: 'No route' }, { status: 404 }))
	);
	await expect(api('nowhere')).rejects.toEqual(new ApiError(404, 'No route'));
});

test('Tiles not answering is status 0', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => Promise.reject(new TypeError('fetch failed')))
	);
	await expect(api('x')).rejects.toMatchObject({ status: 0 });
});

test('every POST says it is JSON, even without a body', async () => {
	const fetch = vi.fn(async () => Response.json({ status: 'success', data: 1 }));
	vi.stubGlobal('fetch', fetch);
	await api('server/start', 'POST');
	expect(fetch).toHaveBeenCalledWith(
		'/v1/tilekit/server/start',
		expect.objectContaining({
			headers: { 'content-type': 'application/json' },
			body: '{}'
		})
	);
});
