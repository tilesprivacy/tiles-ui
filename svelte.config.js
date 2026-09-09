import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx'],

	kit: {
		adapter: adapter({
			assets: './dist',
			fallback: 'index.html',
			pages: './dist',
			precompress: false,
			strict: true
		}),
		// the Tiles app bundle embeds this at /ui and serves it by exact path with
		// no fallback, so the build has to know its subpath. empty by default, this
		// still runs on its own at the root
		paths: {
			base: process.env.TILES_UI_BASE || '',
			relative: false
		},
		router: {
			type: 'hash'
		}
	},

	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()]
};

export default config;
