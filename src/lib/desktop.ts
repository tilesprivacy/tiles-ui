// set by the desktop app before the page loads. in a browser the daemon serves the page itself
type Desktop = {
	// where the daemon listens, the page's own origin is the app's
	daemon: string;
	// why the app couldn't start Tiles, like Tiles not being installed
	problem?: string;
};

export const desktop = () => (globalThis as { __TILES_DESKTOP__?: Desktop }).__TILES_DESKTOP__;
