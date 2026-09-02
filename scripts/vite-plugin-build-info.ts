import { BUILD_CONFIG } from '../src/lib/constants/pwa.constants';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'path';
import type { Plugin } from 'vite';

let processed = false;

const OUTPUT_DIR = BUILD_CONFIG.OUTPUT_DIR;

/**
 * Write build.json with the app version, used by the UI to detect updates.
 */
export function buildInfoPlugin(): Plugin {
	return {
		apply: 'build',
		closeBundle() {
			setTimeout(() => {
				try {
					if (processed) return;

					processed = true;

					const buildNumber = process.env.npm_package_version || '0.0.0';
					const outDir = resolve(OUTPUT_DIR);
					const indexPath = resolve(outDir, 'index.html');

					if (!existsSync(indexPath)) return;

					const buildJsonPath = resolve(outDir, 'build.json');

					writeFileSync(buildJsonPath, JSON.stringify({ version: buildNumber }), 'utf-8');
					console.log(`Created build.json (version: ${buildNumber})`);
				} catch (error) {
					console.error('Failed to write build.json:', error);
				}
			}, 100);
		},
		name: 'tiles:build-info'
	};
}
