import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$lib/utils/api-headers', () => ({ getJsonHeaders: () => ({}) }));
vi.mock('$lib/services/tilekit.service', () => ({
	TilekitService: { pingServer: vi.fn(), startAgent: vi.fn() }
}));

import { ChatService } from '$lib/services/chat.service';
import { TilekitService } from '$lib/services/tilekit.service';

/** The turn the daemon really streams back when the inference server is down. */
const FAILED_TURN = [
	'event: message_start\ndata: {"type":"message_start","message":{"role":"assistant","content":[]}}\n\n',
	'event: message_end\ndata: {"type":"message_end","message":{"role":"assistant","content":[],"stopReason":"error","errorMessage":"Connection error."}}\n\n',
	'event: agent_settled\ndata: {"type":"agent_settled"}\n\n'
];

function sseResponse(chunks: string[]): Response {
	const encoder = new TextEncoder();

	return new Response(
		new ReadableStream({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
				controller.close();
			}
		}),
		{ status: 200 }
	);
}

describe('sendTilekitPrompt with the inference server down', () => {
	const ping = vi.mocked(TilekitService.pingServer);

	beforeEach(() => vi.clearAllMocks());

	it('says the server is offline instead of spinning for pi to give up', async () => {
		ping.mockResolvedValue(false);
		const fetchSpy = vi.fn();

		vi.stubGlobal('fetch', fetchSpy);

		const onError = vi.fn();
		const onComplete = vi.fn();

		await expect(ChatService.sendTilekitPrompt('hi', { onComplete, onError })).rejects.toThrow(
			/offline/i
		);

		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringMatching(/offline/i) })
		);
		expect(onComplete).not.toHaveBeenCalled();
		// never even asked pi, that is the 14 seconds we are saving
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('turns a failed turn into an error rather than an empty reply', async () => {
		// up at the pre-flight, gone by the time the turn fails
		ping.mockResolvedValueOnce(true).mockResolvedValue(false);
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(FAILED_TURN)));

		const onError = vi.fn();
		const onComplete = vi.fn();

		await expect(ChatService.sendTilekitPrompt('hi', { onComplete, onError })).rejects.toThrow(
			/offline/i
		);

		expect(onComplete).not.toHaveBeenCalled();
	});
});
