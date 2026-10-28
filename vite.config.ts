import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// in development Vite serves the UI and passes API calls on to the daemon
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
	define: {
		__UI_VERSION__: JSON.stringify(process.env.npm_package_version)
	},
	server: {
		proxy: {
			// same origin as when the daemon serves the UI. changeOrigin sends the daemon's own
			// address as the Host, which its Host check allows
			'/v1': { target: daemon, changeOrigin: true }
		}
	}
});
