import {
	buildErrorReport,
	buildErrorReportUrl,
	githubIssueUrl,
	isGuidanceError,
	supportMailUrl
} from '$lib/utils/error-report';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('navigator', { userAgent: 'test-agent' });

describe('isGuidanceError', () => {
	it('does not offer a report for conditions the user can fix', () => {
		expect(
			isGuidanceError(
				'The Tiles inference server is offline. Turn it on from the Tiles menu bar to continue chatting.'
			)
		).toBe(true);
		expect(isGuidanceError('Connection refused - server may be offline')).toBe(true);
	});

	it('offers a report for everything else', () => {
		expect(isGuidanceError('OpenAI Responses stream ended before a terminal response event')).toBe(
			false
		);
		expect(isGuidanceError('Failed to parse a 512 byte pi response')).toBe(false);
	});
});

describe('error report url', () => {
	it('round-trips through the fragment encoding', async () => {
		const report = buildErrorReport('something broke', { model: 'test-model' });
		const url = await buildErrorReportUrl(report);

		expect(url.startsWith('https://error.tiles.run/report#z=')).toBe(true);

		// decode the way the error page does
		const b64 = url.split('#z=')[1].replaceAll('-', '+').replaceAll('_', '/');
		const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
		const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
		const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
		const decoded = JSON.parse(await new Response(stream).text());

		expect(decoded).toEqual(report);
	});

	it('carries the report link into the issue and the mail', async () => {
		const report = buildErrorReport('something broke');
		const url = await buildErrorReportUrl(report);

		expect(githubIssueUrl(report, url)).toContain(encodeURIComponent(url));
		expect(supportMailUrl(report, url)).toContain('mailto:hello@tiles.run');
		expect(supportMailUrl(report, url)).toContain(encodeURIComponent(url));
	});
});
