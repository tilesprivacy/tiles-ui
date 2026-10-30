import { goto } from '$app/navigation';
import { api, ApiError, stream } from '#lib/api.ts';
import { apply, type Turn } from '#lib/pi.ts';
import { sessions } from '#lib/state/sessions.svelte.ts';
import { tiles } from '#lib/state/tiles.svelte.ts';
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

	// returns false when nothing was sent
	async send(text: string) {
		const prompt = text.trim();
		if (!prompt || this.streaming) return false;
		this.streaming = true;
		// Pi loses its chat when Tiles restarts
		if (!(await this.#inPi())) {
			this.streaming = false;
			if (chats.live === this) chats.live = null;
			toasts.show("Tiles restarted, so this chat can't go on. Start a new chat to keep going.");
			return false;
		}
		sessions.busy.add(this.id);
		this.turns.push({ role: 'user', text: prompt });
		const reply: Turn = {
			role: 'assistant',
			text: '',
			messages: [],
			tools: {},
			phase: 'waiting',
			since: Date.now(),
			state: 'streaming'
		};
		this.turns.push(reply);
		const live = this.turns[this.turns.length - 1];

		const saved = this.#save('user', prompt).then(() => sessions.load());
		this.#controller = new AbortController();
		// keeps the status line's loading state fresh
		const loading = setInterval(() => {
			if (live.phase === 'waiting' && tiles.model?.state !== 'loaded') tiles.ping();
		}, 1500);
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
		clearInterval(loading);
		this.streaming = false;
		sessions.busy.delete(this.id);
		this.#controller = null;
		await saved;
		// a reply stopped before any text has nothing worth keeping
		if (live.text) await this.#save('assistant', live.text);
		return true;
	}

	#inPi() {
		return api<{ sessionId: string }>('agent/state').then(
			(state) => state.sessionId === this.id,
			() => false
		);
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
	// the chat Pi is in, the only one that can go on for now
	live = $state<Conversation | null>(null);

	async start(text: string) {
		const { id } = await api<{ id: string }>('session/new', 'POST');
		this.live = new Conversation(id);
		await goto(`/chat/${id}`);
		this.live.send(text);
	}

	// old chats are read only, unless Pi is still in one after a reload
	async open(id: string) {
		if (this.live?.id === id) return this.live;
		const conversation = new Conversation(id);
		// agent/state blocks while a reply streams, and only the live chat streams
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
