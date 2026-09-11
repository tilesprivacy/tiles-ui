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

/**
 * Fills in what the daemon's rows cannot know from the local copy the UI
 * wrote while streaming.
 *
 * The rows carry role, text and model only; reasoning, tool calls and timings
 * exist solely in the local copy, so a reload that took the rows verbatim
 * showed the reply stripped of both. The rows still win on membership and
 * order - the daemon is the source of truth for what was said - and the local
 * copy is matched by role and text since the two sides never share ids.
 *
 * A local assistant message the rows do not have yet is the turn that is
 * still streaming: it is appended rather than dropped, so switching back to a
 * generating conversation finds the same message id the stream is writing to
 * and the live text keeps flowing. It is recognized by shape, not by clock:
 * the daemon's last row is a user prompt still waiting for its reply, and the
 * candidate's parent is that prompt's local twin. Timestamps cannot be
 * trusted here - the daemon stamps the prompt row after the local assistant
 * row already exists.
 */
export function overlayLocalMessages(
	messages: DatabaseMessage[],
	local: DatabaseMessage[]
): DatabaseMessage[] {
	const used = new Set<string>();
	const daemonRowOf = new Map<string, DatabaseMessage>();

	for (const message of messages) {
		const match = local.find(
			(candidate) =>
				!used.has(candidate.id) &&
				candidate.role === message.role &&
				candidate.content === message.content
		);

		if (!match) continue;

		used.add(match.id);
		daemonRowOf.set(match.id, message);

		if (match.reasoningContent) message.reasoningContent = match.reasoningContent;

		if (match.toolCalls) message.toolCalls = match.toolCalls;

		if (match.timings) message.timings = match.timings;

		if (match.model && !message.model) message.model = match.model;
	}

	// the streaming turn: the last row is a prompt with no reply yet, and the
	// local tree holds an assistant message hanging off that prompt's twin
	const lastRow = messages[messages.length - 1];

	if (lastRow?.role !== 'user') return messages;

	// the parent points at the prompt's local twin on the first load, and at
	// the daemon row itself after a reload re-homed it, so accept either
	const inFlight = local.find(
		(candidate) =>
			!used.has(candidate.id) &&
			candidate.type === 'text' &&
			candidate.role === 'assistant' &&
			candidate.parent !== null &&
			(daemonRowOf.get(candidate.parent) === lastRow || candidate.parent === lastRow.id)
	);

	if (inFlight) {
		messages.push({ ...inFlight, children: [], parent: lastRow.id });
		lastRow.children.push(inFlight.id);
	}

	restoreToolMessages(messages, local, daemonRowOf);

	return messages;
}

/**
 * Puts tool-result messages back next to the assistant turn they belong to.
 *
 * They exist only locally - the daemon rows know nothing of tool calls - so a
 * reload would drop them and every tool block would sit on "Waiting for
 * result..." again. A tool message follows its parent assistant immediately
 * in display order, which is the shape the message grouping expects.
 */
function restoreToolMessages(
	messages: DatabaseMessage[],
	local: DatabaseMessage[],
	daemonRowOf: Map<string, DatabaseMessage>
): void {
	const keptById = new Map<string, DatabaseMessage>();

	for (const message of messages) keptById.set(message.id, message);

	for (const [localId, daemonRow] of daemonRowOf) keptById.set(localId, daemonRow);

	for (const candidate of local) {
		if (candidate.role !== 'tool' || !candidate.toolCallId || !candidate.parent) continue;

		const home = keptById.get(candidate.parent);

		if (!home || home.role !== 'assistant') continue;

		// after the parent and after any tool siblings already in place
		let at = messages.indexOf(home) + 1;

		if (at === 0) continue;

		while (at < messages.length && messages[at].role === 'tool') at += 1;

		messages.splice(at, 0, { ...candidate, children: [], parent: home.id });
	}
}
