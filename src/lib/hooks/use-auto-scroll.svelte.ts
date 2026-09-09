import {
	AUTO_SCROLL_AT_BOTTOM_THRESHOLD,
	AUTO_SCROLL_INTERVAL,
	PROGRAMMATIC_SCROLL_GRACE_MS
} from '$lib/constants';

export interface AutoScrollOptions {
	disabled?: boolean;
}

/**
 * Creates an auto-scroll controller for a scrollable container.
 *
 * Features:
 * - Auto-scrolls to bottom during streaming/loading
 * - Stops auto-scroll when user manually scrolls up
 * - Resumes auto-scroll when user scrolls back to bottom
 */
export class AutoScrollController {
	private _autoScrollEnabled = $state(true);
	private _container: HTMLElement | undefined;
	private _disabled: boolean;
	private _lastScrollTop = $state(0);
	private _mutationObserver: MutationObserver | null = null;
	private _observerEnabled = false;
	private _programmaticUntil = 0;
	private _rafPending = false;
	private _scrollInterval: ReturnType<typeof setInterval> | undefined;
	private _userScrolledUp = $state(false);
	get autoScrollEnabled(): boolean {
		return this._autoScrollEnabled;
	}

	get userScrolledUp(): boolean {
		return this._userScrolledUp;
	}

	constructor(options: AutoScrollOptions = {}) {
		this._disabled = options.disabled ?? false;
	}

	/**
	 * Cleans up resources. Call this in onDestroy or when the component unmounts.
	 */
	destroy(): void {
		this.stopInterval();
		this._doStopObserving();
	}

	/**
	 * Enables auto-scroll (e.g., when user sends a message).
	 */
	enable(): void {
		if (this._disabled) return;

		this._userScrolledUp = false;
		this._autoScrollEnabled = true;
	}

	/**
	 * Handles scroll events to detect user scroll direction and toggle auto-scroll.
	 */
	handleScroll(): void {
		if (this._disabled || !this._container) return;

		const { clientHeight, scrollHeight, scrollTop } = this._container;

		// our own scrolls come back through here, and a reflow that shortens the
		// page drags the position with it. either one used to look like the user
		// scrolling up, which is what stopped a reply following mid-stream
		if (performance.now() < this._programmaticUntil) {
			this._lastScrollTop = scrollTop;

			return;
		}

		const isAtBottom = scrollHeight - clientHeight - scrollTop < AUTO_SCROLL_AT_BOTTOM_THRESHOLD;

		// only moving away from the bottom counts. content arriving underneath
		// grows the page without anyone scrolling, and that must not read as a
		// person leaving
		if (scrollTop < this._lastScrollTop && !isAtBottom) {
			this._userScrolledUp = true;
			this._autoScrollEnabled = false;
		} else if (isAtBottom) {
			this._userScrolledUp = false;
			this._autoScrollEnabled = true;
		}

		this._lastScrollTop = scrollTop;
	}

	/**
	 * A wheel or a finger, which outranks anything the controller is doing. The
	 * landing pin repeats every frame, so without this a person could not scroll
	 * away from a conversation until it settled.
	 */
	noteUserIntent(): void {
		this._programmaticUntil = 0;
	}

	/**
	 * Resets scroll state when switching conversations.
	 */
	resetScrollState(): void {
		this._userScrolledUp = false;
		this._autoScrollEnabled = !this._disabled;
		this._programmaticUntil = 0;

		if (this._container) {
			this._lastScrollTop = this._container.scrollTop;
		}
	}

	/** Scrolls where the caller asks, and owns it so handleScroll knows it was us. */
	scrollTo(top: number): void {
		if (!this._container) return;

		this._programmaticUntil = performance.now() + PROGRAMMATIC_SCROLL_GRACE_MS;
		this._container.scrollTop = top;
	}

	/**
	 * Scrolls the container to the bottom instantly.
	 */
	scrollToBottom(): void {
		if (this._disabled || !this._container) return;

		this.scrollTo(this._container.scrollHeight);
	}

	/**
	 * Binds the controller to a scrollable container element.
	 */
	setContainer(container: HTMLElement | undefined): void {
		this._doStopObserving();
		this._container = container;

		if (this._observerEnabled && container && !this._disabled) {
			this._doStartObserving();
		}
	}

	/**
	 * Updates the disabled state.
	 */
	setDisabled(disabled: boolean): void {
		if (this._disabled === disabled) return;

		this._disabled = disabled;

		if (disabled) {
			this._autoScrollEnabled = false;
			this.stopInterval();
			this._doStopObserving();
		} else if (this._observerEnabled && this._container && !this._mutationObserver) {
			this._doStartObserving();
		}
	}

	/**
	 * Starts the auto-scroll interval for continuous scrolling during streaming.
	 */
	startInterval(): void {
		if (this._disabled || this._scrollInterval) return;

		this._scrollInterval = setInterval(() => {
			this.scrollToBottom();
		}, AUTO_SCROLL_INTERVAL);
	}

	/**
	 * Starts a MutationObserver on the container that auto-scrolls to bottom
	 * on content changes. More responsive than interval-based polling.
	 */
	startObserving(): void {
		this._observerEnabled = true;

		if (this._container && !this._disabled && !this._mutationObserver) {
			this._doStartObserving();
		}
	}

	/**
	 * Stops the auto-scroll interval.
	 */
	stopInterval(): void {
		if (this._scrollInterval) {
			clearInterval(this._scrollInterval);
			this._scrollInterval = undefined;
		}
	}

	/**
	 * Stops the MutationObserver.
	 */
	stopObserving(): void {
		this._observerEnabled = false;
		this._doStopObserving();
	}

	/**
	 * Updates the auto-scroll interval based on streaming state.
	 * Call this in a $effect to automatically manage the interval.
	 */
	updateInterval(isStreaming: boolean): void {
		if (this._disabled) {
			this.stopInterval();

			return;
		}

		if (isStreaming && this._autoScrollEnabled) {
			if (!this._scrollInterval) {
				this.startInterval();
			}
		} else {
			this.stopInterval();
		}
	}

	private _doStartObserving(): void {
		if (!this._container || this._mutationObserver) return;

		this._mutationObserver = new MutationObserver(() => {
			if (!this._autoScrollEnabled || this._rafPending) return;

			this._rafPending = true;
			requestAnimationFrame(() => {
				this._rafPending = false;

				if (this._autoScrollEnabled && this._container) {
					this.scrollTo(this._container.scrollHeight);
				}
			});
		});

		this._mutationObserver.observe(this._container, {
			characterData: true,
			childList: true,
			subtree: true
		});
	}

	private _doStopObserving(): void {
		if (this._mutationObserver) {
			this._mutationObserver.disconnect();
			this._mutationObserver = null;
		}

		this._rafPending = false;
	}
}

/**
 * Creates a new AutoScrollController instance.
 */
export function createAutoScrollController(options: AutoScrollOptions = {}): AutoScrollController {
	return new AutoScrollController(options);
}
