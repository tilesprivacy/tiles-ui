import { buildInfoPlugin } from './scripts/vite-plugin-build-info';
import { nerdamerPlugin } from './scripts/vite-plugin-nerdamer';
import { splashScreenPlugin } from './scripts/vite-plugin-splash-screen';
import { SVELTEKIT_PWA_OPTIONS } from './src/lib/constants/pwa.constants';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { playwright } from '@vitest/browser-playwright';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserBaseConfig: any = {
	enabled: true,
	instances: [{ browser: 'chromium' }],
	provider: playwright({
		launchOptions: {
			args: ['--no-sandbox']
		}
	})
};

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_PUBLIC_');
	const SERVER_ORIGIN = env.VITE_PUBLIC_SERVER_ORIGIN || 'http://127.0.0.1:1729';

	return {
		build: {
			assetsInlineLimit: 32000,
			chunkSizeWarningLimit: 3072,
			minify: true
		},

		plugins: [
			tailwindcss(),
			sveltekit(),
			// a desktop shell has no offline story, and a worker scoped to the app
			// root takes over navigation, which is the shell's job. disable keeps
			// the virtual modules the layout imports and ships no worker at all
			SvelteKitPWA({
				...SVELTEKIT_PWA_OPTIONS,
				disable: env.VITE_PUBLIC_NO_PWA === '1'
			}),
			splashScreenPlugin(),
			buildInfoPlugin(),
			nerdamerPlugin()
		],

		preview: {
			allowedHosts: ['.trycloudflare.com'],
			proxy: {
				'/v1': SERVER_ORIGIN
			}
		},

		resolve: {
			alias: {
				'katex-fonts': resolve('node_modules/katex/dist/fonts')
			}
		},

		server: {
			allowedHosts: ['.trycloudflare.com'],
			fs: {
				allow: [searchForWorkspaceRoot(process.cwd()), resolve(__dirname, 'tests')]
			},
			proxy: {
				'/v1': SERVER_ORIGIN
			}
		},

		test: {
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						browser: browserBaseConfig,
						include: ['tests/client/**/*.svelte.{test,spec}.{js,ts}'],
						name: 'client',
						setupFiles: ['./vitest-setup-client.ts']
					}
				},

				{
					extends: './vite.config.ts',
					test: {
						environment: 'node',
						include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
						name: 'unit'
					}
				},

				{
					extends: './vite.config.ts',
					plugins: [
						storybookTest({
							storybookScript: 'npm run storybook -- --no-open'
						})
					],
					test: {
						browser: { ...browserBaseConfig, instances: [{ browser: 'chromium', headless: true }] },
						name: 'ui'
					}
				}
			]
		}
	};
});
