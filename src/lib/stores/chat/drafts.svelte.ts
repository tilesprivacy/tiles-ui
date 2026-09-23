/**
 * DraftMessagesStore - Per-conversation input drafts
 *
 * Keeps in-memory drafts (message text + files) keyed by conversation id,
 * plus a dedicated key for the new-chat screen, so the input box restores
 * its content when switching conversations.
 */

import { NEW_CHAT_DRAFT_KEY } from '$lib/constants';

interface DraftMessage {
	message: string;
	files: ChatUploadedFile[];
}

class DraftMessagesStore {
	prefill = $state<string | null>(null);

	private drafts = new Map<string, DraftMessage>();

	clearDraftMessage(chatId: string | undefined): void {
		const key = chatId ?? NEW_CHAT_DRAFT_KEY;

		this.drafts.delete(key);
	}

	getDraftMessage(chatId: string | undefined): DraftMessage {
		const key = chatId ?? NEW_CHAT_DRAFT_KEY;

		return this.drafts.get(key) ?? { files: [], message: '' };
	}

	saveDraftMessage(chatId: string | undefined, message: string, files: ChatUploadedFile[]): void {
		const key = chatId ?? NEW_CHAT_DRAFT_KEY;

		if (message || files.length > 0) {
			this.drafts.set(key, { files: [...files], message });
		} else {
			this.drafts.delete(key);
		}
	}

	/** also saved as the new chat draft, so the draft restore on navigation cannot undo it */
	setPrefill(message: string): void {
		this.saveDraftMessage(undefined, message, []);
		this.prefill = message;
	}

	takePrefill(): string | null {
		const message = this.prefill;

		this.prefill = null;

		return message;
	}
}

export const draftMessagesStore = new DraftMessagesStore();
