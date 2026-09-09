/**
 * Whether this build is embedded in the Tiles desktop app rather than served.
 *
 * The build script sets the same flag that drops the service worker, because a
 * shell has neither. Anything that assumes the page can change underneath it,
 * or that there is an origin to poll, has to check this first.
 */
export const IN_SHELL = import.meta.env.VITE_PUBLIC_NO_PWA === '1';
