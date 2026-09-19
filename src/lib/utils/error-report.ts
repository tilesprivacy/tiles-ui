/**
 * Error reports that travel with the user instead of phoning home.
 *
 * The report is compressed and packed into the URL *fragment* of a page on
 * error.tiles.run. Fragments are never sent in HTTP requests, so nothing
 * reaches any server unless the person chooses to share the link - the same
 * model as the Linux kernel's DRM panic QR codes, where the report rides the
 * QR itself and the machine transmits nothing.
 */

const ERROR_PAGE = 'https://error.tiles.run/report';
const GITHUB_NEW_ISSUE = 'https://github.com/tilesprivacy/tiles/issues/new';
const SUPPORT_EMAIL = 'hello@tiles.run';

export type ErrorReport = {
	schema: number;
	component: string;
	error: string;
	model?: string;
	appVersion?: string;
	userAgent: string;
	createdAt: string;
};

export function buildErrorReport(
	error: string,
	context: { model?: string; appVersion?: string; component?: string } = {}
): ErrorReport {
	return {
		appVersion: context.appVersion,
		component: context.component ?? 'chat-ui',
		createdAt: new Date().toISOString(),
		error,
		model: context.model,
		schema: 1,
		userAgent: navigator.userAgent
	};
}

/** deflate + base64url, the decoder page reverses both. */
export async function buildErrorReportUrl(report: ErrorReport): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(report));
	const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
	const compressed = new Uint8Array(await new Response(stream).arrayBuffer());

	let binary = '';

	for (const byte of compressed) binary += String.fromCharCode(byte);

	const encoded = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');

	return `${ERROR_PAGE}#z=${encoded}`;
}

/** A prefilled new-issue page carrying the report link. */
export function githubIssueUrl(report: ErrorReport, reportUrl: string): string {
	const title = `[error] ${report.error.slice(0, 80)}`;
	const body = [
		'**What happened**',
		'',
		'<!-- describe what you were doing -->',
		'',
		'**Error**',
		'',
		'```',
		report.error,
		'```',
		'',
		`**Full report:** ${reportUrl}`,
		'',
		`Model: ${report.model ?? 'unknown'} · Component: ${report.component} · ${report.createdAt}`
	].join('\n');

	return `${GITHUB_NEW_ISSUE}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** A prefilled mail to support carrying the report link. */
export function supportMailUrl(report: ErrorReport, reportUrl: string): string {
	const subject = `Tiles error: ${report.error.slice(0, 60)}`;
	const body = `Hi,\n\nI ran into this error in Tiles:\n\n${report.error}\n\nFull report: ${reportUrl}\n\nWhat I was doing:\n`;

	return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
