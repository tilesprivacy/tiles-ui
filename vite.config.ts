import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// the daemon only opens its UI port when a built UI is installed, so dev talks to 1729
const daemon = process.env.TILES_DAEMON ?? 'http://127.0.0.1:1729';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// the daemon answers every unknown path with index.html, so app links like /chat/<id> load
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	server: {
		proxy: {
			// same origin as when the daemon serves the UI. changeOrigin sends the daemon's own
			// address as the Host, which its Host check allows
			'/v1': { target: daemon, changeOrigin: true }
		}
	}
});
