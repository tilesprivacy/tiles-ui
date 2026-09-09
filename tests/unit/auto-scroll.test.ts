import { createAutoScrollController } from '$lib/hooks/use-auto-scroll.svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A container whose scroll geometry the test drives directly. */
function container(scrollHeight: number, clientHeight: number, scrollTop = 0) {
	return { clientHeight, scrollHeight, scrollTop } as HTMLElement;
}

describe('AutoScrollController', () => {
	beforeEach(() => vi.restoreAllMocks());

	it('keeps following after it scrolls itself to the bottom', () => {
		const box = container(1000, 500);
		const c = createAutoScrollController();

		c.setContainer(box);
		c.scrollToBottom();
		// the browser fires a scroll event for that, same as it would for a person
		c.handleScroll();

		expect(box.scrollTop).toBe(1000);
		expect(c.userScrolledUp).toBe(false);
		expect(c.autoScrollEnabled).toBe(true);
	});

	it('keeps following when a reflow drags the position back a little', () => {
		const box = container(1000, 500);
		const c = createAutoScrollController();

		c.setContainer(box);
		c.scrollToBottom();
		// content settles and the page shortens under us, moving scrollTop up
		box.scrollTop = 480;
		c.handleScroll();

		expect(c.autoScrollEnabled).toBe(true);
	});

	it('stops following once a person scrolls away from the bottom', () => {
		const box = container(1000, 500, 500);
		const c = createAutoScrollController();

		c.setContainer(box);
		// sitting at the bottom, then dragging up, the way the events really arrive
		c.handleScroll();
		box.scrollTop = 100;
		c.handleScroll();

		expect(c.userScrolledUp).toBe(true);
		expect(c.autoScrollEnabled).toBe(false);
	});

	it('follows again when they come back to the bottom', () => {
		const box = container(1000, 500, 500);
		const c = createAutoScrollController();

		c.setContainer(box);
		c.handleScroll();
		box.scrollTop = 100;
		c.handleScroll();
		box.scrollTop = 500;
		c.handleScroll();

		expect(c.userScrolledUp).toBe(false);
		expect(c.autoScrollEnabled).toBe(true);
	});

	it('lets a wheel win against a pin that repeats every frame', () => {
		const box = container(1000, 500, 500);
		const c = createAutoScrollController();

		c.setContainer(box);
		c.scrollToBottom();
		c.handleScroll();
		// the landing pin just ran, so we are inside its grace window
		c.noteUserIntent();
		box.scrollTop = 0;
		c.handleScroll();

		expect(c.userScrolledUp).toBe(true);
	});

	it('ignores scrolling while disabled', () => {
		const box = container(1000, 500, 0);
		const c = createAutoScrollController({ disabled: true });

		c.setContainer(box);
		c.handleScroll();

		expect(c.userScrolledUp).toBe(false);
	});
});

describe('AutoScrollController.pause', () => {
	it('stops following before the scroll event has a chance to arrive', () => {
		const box = { clientHeight: 500, scrollHeight: 1000, scrollTop: 500 } as HTMLElement;
		const c = createAutoScrollController();

		c.setContainer(box);
		c.scrollToBottom();
		// a wheel up, while content is still landing and pinning every mutation
		c.pause();

		expect(c.autoScrollEnabled).toBe(false);
		expect(c.userScrolledUp).toBe(true);
	});
});
