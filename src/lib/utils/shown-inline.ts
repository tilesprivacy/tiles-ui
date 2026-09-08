/**
 * A failed turn is shown as red text on the assistant message itself. The error
 * still travels up to the send path, which would otherwise open a dialog saying
 * the same thing again, so mark the ones the thread has already reported.
 */

const SHOWN_INLINE = Symbol.for('tiles.shownInline');

export function markShownInline(error: unknown): void {
	if (error instanceof Error) {
		(error as Error & { [SHOWN_INLINE]?: boolean })[SHOWN_INLINE] = true;
	}
}

export function wasShownInline(error: unknown): boolean {
	return (
		error instanceof Error && (error as Error & { [SHOWN_INLINE]?: boolean })[SHOWN_INLINE] === true
	);
}
