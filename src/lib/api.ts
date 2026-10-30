export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly reason: string
	) {
		super(reason);
	}
}

// status 0 means the daemon didn't answer
const unreachable = () => new ApiError(0, "Can't reach Tiles");

function init(method: string, body?: unknown, signal?: AbortSignal): RequestInit {
	// the daemon rejects a POST without a JSON content type
	const json = method === 'POST';
	return {
		method,
		signal,
		headers: json ? { 'content-type': 'application/json' } : undefined,
		body: json ? JSON.stringify(body ?? {}) : undefined
	};
}

async function send(path: string, request: RequestInit) {
	let res: Response;
	try {
		res = await fetch(`/v1/tilekit/${path}`, request);
	} catch (err) {
		if (request.signal?.aborted) throw err;
		throw unreachable();
	}
	if (!res.ok) {
		const failed = await res.json().catch(() => null);
		throw new ApiError(res.status, failed?.reason ?? res.statusText);
	}
	return res;
}

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
	const res = await send(path, init(method, body));
	return (await res.json()).data;
}

export type SseEvent = { event: string; data: string };

// reads a text/event-stream until it ends or `signal` aborts
export async function* stream(
	path: string,
	{ method = 'GET', body, signal }: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): AsyncGenerator<SseEvent> {
	const res = await send(path, init(method, body, signal));
	const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = '';
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) return;
			buffer += value;
			let end;
			while ((end = buffer.search(/\r?\n\r?\n/)) >= 0) {
				const block = buffer.slice(0, end);
				buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, '');
				let event = 'message';
				const data: string[] = [];
				for (const line of block.split(/\r?\n/)) {
					if (line.startsWith('event:')) event = line.slice(6).trim();
					else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
				}
				if (data.length) yield { event, data: data.join('\n') };
			}
		}
	} catch (err) {
		if (signal?.aborted) return;
		throw err instanceof ApiError ? err : unreachable();
	} finally {
		reader.cancel().catch(() => {});
	}
}
