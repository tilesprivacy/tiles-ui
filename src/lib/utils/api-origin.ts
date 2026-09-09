/**
 * Where the daemon lives, which is not where this app lives.
 *
 * Served from Vite, the two share an origin and the dev proxy forwards `/v1`.
 * Embedded in the Tiles app bundle the page is on `tauri://localhost`, so calls
 * have to name the daemon outright. Empty means same origin.
 */
export const API_ORIGIN = import.meta.env.VITE_PUBLIC_API_ORIGIN || '';
