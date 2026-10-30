import { goto } from '$app/navigation';
import { api, ApiError, stream } from '#lib/api.ts';
import { apply, type Turn } from '#lib/pi.ts';
import { sessions } from '#lib/state/sessions.svelte.ts';
import { toasts } from '#lib/state/toasts.svelte.ts';
import type { Chat } from '#lib/types.ts';

class Conversation {
	turns = $state<Turn[]>([]);
	streaming = $state(false);
	// the last saved row, the parent of the next one
	#parent: string | null = null;
	#controller: AbortController | null = null;

	constructor(readonly id: string) {}

	async load() {
		const { chats } = await api<{ chats: Chat[] }>(`session/${this.id}/chats`);
		this.turns = chats.map(({ role, content }) => ({ role, text: content, state: 'done' }));
		this.#parent = chats.at(-1)?.id ?? null;
	}

	async send(text: string) {
		const prompt = text.trim();
		if (!prompt || this.streaming) return;
		this.streaming = true;
		sessions.busy.add(this.id);
		this.turns.push({ role: 'user', text: prompt });
		const reply: Turn = {
			role: 'assistant',
			text: '',
			messages: [],
			tools: {},
			state: 'streaming'
		};
		this.turns.push(reply);
		const live = this.turns[this.turns.length - 1];

		const saved = this.#save('user', prompt).then(() => sessions.load());
		this.#controller = new AbortController();
		try {
			for await (const { event, data } of stream('agent/prompt', {
				method: 'POST',
				body: { message: prompt },
				signal: this.#controller.signal
			})) {
				if (event === 'error') throw new Error(data);
				apply(live, JSON.parse(data));
			}
			if (this.#controller.signal.aborted) live.state = 'stopped';
			else if (live.state === 'streaming') live.state = 'done';
		} catch (err) {
			live.state = 'failed';
			live.error =
				err instanceof ApiError && err.status === 0
					? 'Lost connection to Tiles'
					: (err as Error).message;
		}
		this.streaming = false;
		sessions.busy.delete(this.id);
		this.#controller = null;
		await saved;
		// a reply stopped before any text has nothing worth keeping
		if (live.text) await this.#save('assistant', live.text);
	}

	stop() {
		this.#controller?.abort();
	}

	async #save(role: 'user' | 'assistant', text: string) {
		const body = { text, session_id: this.id, role, parent_chat_id: this.#parent };
		try {
			this.#parent = (await api<Chat>('session/chat', 'POST', body)).id;
		} catch (err) {
			toasts.show(
				`Couldn't save this ${role === 'user' ? 'message' : 'reply'}: ${(err as Error).message}`,
				{
					label: 'Retry',
					run: () => this.#save(role, text)
				}
			);
		}
	}
}

class Chats {
	// the chat Pi is in. only it can be continued until Tiles can reopen old chats
	live = $state<Conversation | null>(null);

	async start(text: string) {
		const { id } = await api<{ id: string }>('session/new', 'POST');
		this.live = new Conversation(id);
		await goto(`/chat/${id}`);
		this.live.send(text);
	}

	// an old chat stays read only, unless Pi is still in it from before a reload
	async open(id: string) {
		if (this.live?.id === id) return this.live;
		const conversation = new Conversation(id);
		// agent/state waits behind a streaming reply, which can only be the live chat's
		const asking = this.live?.streaming
			? null
			: api<{ sessionId: string }>('agent/state').catch(() => null);
		const [, state] = await Promise.all([conversation.load(), asking]);
		if (state?.sessionId === id) this.live = conversation;
		return conversation;
	}
}

export const chats = new Chats();
export type { Conversation, Turn };
