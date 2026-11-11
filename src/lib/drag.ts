import { getCurrentWindow } from '@tauri-apps/api/window';
import { desktop } from './desktop.ts';

// moves the window by an element's empty space, for the title bar the app draws.
// the drag waits for the pointer to move: starting it on the press hands the pointer to
// the window manager, and the second click of a double click never reaches the page
export function dragsWindow(node: HTMLElement) {
	if (!desktop()?.titlebar) return;
	const win = getCurrentWindow();
	let from: { x: number; y: number } | null = null;

	const down = (e: MouseEvent) => {
		if (e.button === 0 && e.target === node) from = { x: e.screenX, y: e.screenY };
	};
	const move = (e: MouseEvent) => {
		if (!from) return;
		if (!(e.buttons & 1)) from = null;
		else if (Math.hypot(e.screenX - from.x, e.screenY - from.y) > 3) {
			from = null;
			void win.startDragging();
		}
	};
	const up = () => (from = null);
	const twice = (e: MouseEvent) => {
		if (e.button === 0 && e.target === node) void win.toggleMaximize();
	};

	node.addEventListener('mousedown', down);
	node.addEventListener('dblclick', twice);
	window.addEventListener('mousemove', move);
	window.addEventListener('mouseup', up);
	return {
		destroy() {
			node.removeEventListener('mousedown', down);
			node.removeEventListener('dblclick', twice);
			window.removeEventListener('mousemove', move);
			window.removeEventListener('mouseup', up);
		}
	};
}
