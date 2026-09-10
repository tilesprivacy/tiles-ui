import { MessageRole } from '$lib/enums';
import { overlayLocalMessages } from '$lib/services/tilekit-adapter';
import type { DatabaseMessage } from '$lib/types/database';
import { describe, expect, it } from 'vitest';

let counter = 0;

function makeMessage(overrides: Partial<DatabaseMessage> = {}): DatabaseMessage {
	counter += 1;

	return {
		children: [],
		content: '',
		convId: 'conv-1',
		id: `msg-${counter}`,
		parent: null,
		role: MessageRole.ASSISTANT,
		timestamp: 1000 + counter,
		type: 'text',
		...overrides
	} as DatabaseMessage;
}

describe('overlayLocalMessages', () => {
	it('carries reasoning and tool calls onto the matching daemon row', () => {
		const rows = [
			makeMessage({ content: 'a question', id: 'row-user', role: MessageRole.USER }),
			makeMessage({ content: 'the answer', id: 'row-assistant' })
		];
		const local = [
			makeMessage({ content: 'a question', role: MessageRole.USER }),
			makeMessage({
				content: 'the answer',
				reasoningContent: 'thought about it',
				toolCalls: '[{"id":"t1"}]'
			})
		];
		const merged = overlayLocalMessages(rows, local);

		// the daemon rows still decide membership and identity
		expect(merged).toHaveLength(2);
		expect(merged[1].id).toBe('row-assistant');
		// the local copy fills in what the rows cannot know
		expect(merged[1].reasoningContent).toBe('thought about it');
		expect(merged[1].toolCalls).toBe('[{"id":"t1"}]');
	});

	it('appends the still-streaming turn hanging off the unanswered prompt', () => {
		const rows = [makeMessage({ content: 'a question', id: 'row-user', role: MessageRole.USER })];
		// the local twin of the prompt, and the streaming reply under it. the
		// assistant's timestamp is OLDER than the daemon row's on purpose: the
		// daemon stamps the prompt after the local reply already exists
		const localUser = makeMessage({
			content: 'a question',
			id: 'local-user',
			role: MessageRole.USER,
			timestamp: 10
		});
		const streaming = makeMessage({
			content: '',
			id: 'live-1',
			parent: 'local-user',
			timestamp: 5
		});
		// a hydrated daemon-id copy of the prompt, newer than everything, must
		// not confuse the pick
		const hydratedCopy = makeMessage({
			content: 'a question',
			id: 'row-user',
			role: MessageRole.USER,
			timestamp: 99
		});
		const merged = overlayLocalMessages(rows, [localUser, streaming, hydratedCopy]);

		// the id survives, so the stream's index lookups find it again
		expect(merged).toHaveLength(2);
		expect(merged[1].id).toBe('live-1');
		expect(merged[1].parent).toBe('row-user');
	});

	it('does not append when the prompt already has its reply', () => {
		const rows = [
			makeMessage({ content: 'a question', role: MessageRole.USER }),
			makeMessage({ content: 'the answer' })
		];
		const localUser = makeMessage({
			content: 'a question',
			id: 'local-user',
			role: MessageRole.USER
		});
		// a crashed stream's leftover under an answered prompt
		const ghost = makeMessage({ content: '', id: 'ghost', parent: 'local-user' });
		const merged = overlayLocalMessages(rows, [localUser, ghost]);

		expect(merged).toHaveLength(2);
		expect(merged.map((m) => m.id)).not.toContain('ghost');
	});

	it('does not resurrect an old local row as new output', () => {
		const rows = [
			makeMessage({ content: 'q1', role: MessageRole.USER }),
			makeMessage({ content: 'answer one' })
		];
		// matched by content, so it is an overlay, never an append
		const localCopy = makeMessage({ content: 'answer one', reasoningContent: 'kept' });
		const merged = overlayLocalMessages(rows, [localCopy]);

		expect(merged).toHaveLength(2);
		expect(merged[1].reasoningContent).toBe('kept');
	});
});
