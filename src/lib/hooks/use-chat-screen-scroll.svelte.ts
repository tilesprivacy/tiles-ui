/**
 * Scroll container binding and navigation guard for the ChatScreen.
 *
 * Binds the `AutoScrollController` to `document.documentElement`, exposes
 * the container for programmatic scrolling, and flags an `isNavigating`
 * window during route changes so the controller can reset without its
 * scroll handler seeing spurious events from layout shifts.
 */

import type { AutoScrollController } from './use-auto-scroll.svelte';
import { afterNavigate, beforeNavigate } from '$app/navigation';

export function useChatScreenScroll(autoScroll: AutoScrollController) {
	let chatScrollContainer: HTMLElement | undefined = $state();
	let isNavigating = $state(false);

	function handleScroll(event: UIEvent) {
		// navigation shifts the layout, and the events that fall out of that are
		// nobody scrolling. the controller sorts out its own scrolls, isTrusted
		// cannot: the browser fires those too
		if (isNavigating || !event.isTrusted) return;

		autoScroll.handleScroll();
	}

	beforeNavigate(() => {
		isNavigating = true;
		autoScroll.resetScrollState();
	});

	afterNavigate(() => {
		setTimeout(() => {
			isNavigating = false;
			autoScroll.resetScrollState();
		}, 10);
	});

	$effect(() => {
		chatScrollContainer = document.documentElement;
		autoScroll.setContainer(chatScrollContainer);
	});

	return {
		get chatScrollContainer() {
			return chatScrollContainer;
		},
		handleScroll
	};
}
