/**
 * Translates between the daemon's session/chat rows and the shapes this UI
 * was built around.
 *
 * The two models do not line up exactly. Tiles stores a flat list of chats
 * with a parent pointer (`context_id`, which is called `parent_chat_id` when
 * you write it), while the UI expects a tree with `children` arrays and a
 * current leaf. The children are derived here on load; branching stays off
 * until the daemon can store one.
 */

import type { TilekitChat, TilekitSession } from '$lib/types/tilekit';

/** Tiles keeps unix seconds; the UI works in milliseconds. */
function toMillis(seconds: number): number {
	return seconds < 1e12 ? seconds * 1000 : seconds;
}

export function sessionToConversation(session: TilekitSession): DatabaseConversation {
	return {
		currNode: null,
		id: session.id,
		lastModified: toMillis(session.created_at),
		name: session.name || 'Untitled'
	};
}

export function chatToMessage(chat: TilekitChat): DatabaseMessage {
	return {
		children: [],
		content: chat.content,
		convId: chat.session_id,
		id: chat.id,
		model: chat.model_name || undefined,
		parent: chat.context_id ?? null,
		role: chat.role as DatabaseMessage['role'],
		timestamp: toMillis(chat.created_at),
		type: 'text'
	};
}

/**
 * Orders the chats, links each one to its parent, and fills in the `children`
 * arrays the tree walker needs. Chats whose parent is missing are chained to
 * whatever came before them, so a conversation the REPL wrote - which does not
 * always set a parent - still reads as one thread.
 */
export function chatsToMessages(chats: TilekitChat[]): DatabaseMessage[] {
	const ordered = [...chats].sort((a, b) => a.row_counter - b.row_counter);
	const messages = ordered.map(chatToMessage);
	const byId = new Map(messages.map((m) => [m.id, m]));

	let previousId: string | null = null;

	for (const message of messages) {
		if (message.parent && !byId.has(message.parent)) message.parent = null;

		if (!message.parent) message.parent = previousId;

		if (message.parent) byId.get(message.parent)?.children.push(message.id);

		previousId = message.id;
	}

	return messages;
}

/** The newest message, which is where a resumed conversation should sit. */
export function leafOf(messages: DatabaseMessage[]): string | null {
	return messages.length ? messages[messages.length - 1].id : null;
}
