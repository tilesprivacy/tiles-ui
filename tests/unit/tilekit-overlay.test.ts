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

	it('appends the still-streaming turn under its own id', () => {
		const rows = [makeMessage({ content: 'a question', role: MessageRole.USER, timestamp: 10 })];
		const streaming = makeMessage({
			content: 'partial rep',
			id: 'live-1',
			timestamp: 20
		});
		const merged = overlayLocalMessages(rows, [
			makeMessage({ content: 'a question', role: MessageRole.USER, timestamp: 10 }),
			streaming
		]);

		// the id survives, so the stream's index lookups find it again
		expect(merged).toHaveLength(2);
		expect(merged[1].id).toBe('live-1');
		expect(merged[1].parent).toBe(rows[0].id);
	});

	it('trusts an empty local assistant row only when it is the newest', () => {
		const rows = [
			makeMessage({ content: 'q1', role: MessageRole.USER, timestamp: 10 }),
			makeMessage({ content: 'answer one', timestamp: 20 }),
			makeMessage({ content: 'q2', role: MessageRole.USER, timestamp: 30 })
		];
		// a crashed stream's leftover: empty, unmatched, but not the newest
		const ghost = makeMessage({ content: '', id: 'ghost', timestamp: 40 });
		const live = makeMessage({ content: '', id: 'live', timestamp: 50 });
		const merged = overlayLocalMessages(rows, [ghost, live]);
		const appendedIds = merged.slice(rows.length - 1).map((m) => m.id);

		expect(appendedIds).not.toContain('ghost');
		expect(appendedIds).toContain('live');
	});

	it('does not resurrect an old local row as new output', () => {
		const rows = [
			makeMessage({ content: 'q1', role: MessageRole.USER, timestamp: 10 }),
			makeMessage({ content: 'answer one', timestamp: 20 })
		];
		// matched by content, so it is an overlay, never an append
		const localCopy = makeMessage({
			content: 'answer one',
			reasoningContent: 'kept',
			timestamp: 15
		});
		const merged = overlayLocalMessages(rows, [localCopy]);

		expect(merged).toHaveLength(2);
		expect(merged[1].reasoningContent).toBe('kept');
	});
});
