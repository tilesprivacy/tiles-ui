import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// dev: Vite serves the UI and proxies API calls to the daemon
const daemon = process.env.TILES_DAEMON ?? 'http://127.0.0.1:1729';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// unknown paths get index.html, app links like /chat/<id> need it
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	define: {
		__UI_VERSION__: JSON.stringify(process.env.npm_package_version)
	},
	server: {
		proxy: {
			// same origin, like the daemon's own UI. changeOrigin passes the daemon's Host check
			'/v1': { target: daemon, changeOrigin: true }
		}
	}
});
