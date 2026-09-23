import ChatScreenFormTestWrapper from './components/ChatScreenFormTestWrapper.svelte';
import TestWrapper from './components/TestWrapper.svelte';
import { conversationsStore, draftMessagesStore } from '$lib/stores';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const { navigation, state } = vi.hoisted(() => ({
	navigation: {
		afterNavigate: vi.fn(),
		beforeNavigate: vi.fn(),
		goto: vi.fn(),
		replaceState: vi.fn()
	},
	state: { page: { params: {}, url: new URL('http://localhost/?draft=hello%20there') } }
}));

vi.mock('$app/navigation', () => navigation);
vi.mock('$app/state', () => state);

// ?draft= fills the input and never sends
describe('new chat ?draft=', () => {
	afterEach(() => {
		draftMessagesStore.takePrefill();
		draftMessagesStore.clearDraftMessage(undefined);
		vi.restoreAllMocks();
	});

	it('hands the text to the input and drops the param', async () => {
		const create = vi.spyOn(conversationsStore, 'createConversation');

		render(TestWrapper);

		await vi.waitFor(() => expect(navigation.replaceState).toHaveBeenCalled());

		expect(draftMessagesStore.prefill).toBe('hello there');
		expect(draftMessagesStore.getDraftMessage(undefined).message).toBe('hello there');
		expect(String(navigation.replaceState.mock.calls[0][0])).not.toContain('draft');
		expect(create).not.toHaveBeenCalled();
	});

	it('types the prefill into the new chat form without sending', async () => {
		const onSend = vi.fn(async () => true);

		draftMessagesStore.setPrefill('typed, not sent');

		const screen = render(ChatScreenFormTestWrapper, { onSend });

		await vi.waitFor(() =>
			expect(screen.container.textContent + inputValues(screen.container)).toContain(
				'typed, not sent'
			)
		);

		expect(draftMessagesStore.prefill).toBeNull();
		expect(onSend).not.toHaveBeenCalled();
	});
});

function inputValues(root: HTMLElement): string {
	return [...root.querySelectorAll('textarea, input')]
		.map((el) => (el as HTMLTextAreaElement).value)
		.join(' ');
}
