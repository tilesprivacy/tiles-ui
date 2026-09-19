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
/**
 * Errors that already tell the person what to do. They are conditions, not
 * defects - a report of "the server is off" helps nobody, and offering one
 * teaches people to ignore the report button on the errors that matter.
 */
const GUIDANCE_ERRORS = [
	'The Tiles inference server is offline. Turn it on from the Tiles menu bar to continue chatting.',
	'Unable to connect to server - please check if the server is running',
	'Connection refused - server may be offline',
	'Request timed out - the server took too long to respond',
	'No response received from server. Please try again.',
	'Stream connection lost and could not be resumed'
];

/** True when the error is actionable guidance rather than something to report. */
export function isGuidanceError(message: string): boolean {
	return GUIDANCE_ERRORS.includes(message.trim());
}

export type ErrorReport = {
	schema: number;
	component: string;
	error: string;
	model?: string;
	appVersion?: string;
	userAgent: string;
	createdAt: string;
	logTail?: string[];
};

export function buildErrorReport(
	error: string,
	context: {
		model?: string;
		appVersion?: string;
		component?: string;
		logTail?: string[];
	} = {}
): ErrorReport {
	return {
		appVersion: context.appVersion,
		component: context.component ?? 'chat-ui',
		createdAt: new Date().toISOString(),
		error,
		logTail: context.logTail?.length ? context.logTail : undefined,
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
