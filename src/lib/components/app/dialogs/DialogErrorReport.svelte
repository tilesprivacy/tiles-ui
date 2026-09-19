<script lang="ts">
	import { Bug, Copy, Mail } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { TilekitService } from '$lib/services/tilekit.service';
	import {
		buildErrorReport,
		buildErrorReportUrl,
		type ErrorReport,
		githubIssueUrl,
		supportMailUrl
	} from '$lib/utils/error-report';
	import { renderSVG } from 'uqr';

	interface Props {
		open: boolean;
		error: string;
		model?: string;
		onClose: () => void;
	}

	let { error, model, onClose, open = $bindable() }: Props = $props();

	let report = $state<ErrorReport | null>(null);
	let reportUrl = $state('');
	let qrSvg = $state('');
	let copied = $state(false);

	$effect(() => {
		if (!open) return;

		void (async () => {
			// the daemon's scrubbed log tail gives the error its context;
			// best-effort, a report without it still beats no report
			const logTail = await TilekitService.diagnosticsLogs();

			let built = buildErrorReport(error, { logTail, model });
			let url = await buildErrorReportUrl(built);

			// a QR only stays phone-scannable up to a point; past it the log
			// tail is the thing to sacrifice, never the error itself
			if (url.length > 2800 && logTail.length) {
				built = buildErrorReport(error, { model });
				url = await buildErrorReportUrl(built);
			}

			report = built;
			reportUrl = url;
			// scanning the code carries the whole report - the phone gets the
			// same page the buttons below link to
			qrSvg = renderSVG(url, { border: 2 });
		})();
	});

	async function copyLink() {
		await navigator.clipboard.writeText(reportUrl);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<Dialog.Root
	onOpenChange={(next) => {
		if (!next) onClose();
	}}
	{open}
>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Report this error</Dialog.Title>

			<Dialog.Description>
				The report below never leaves this device on its own. Scan the code with your phone or use a
				button - you choose where it goes.
			</Dialog.Description>
		</Dialog.Header>

		{#if qrSvg}
			<div class="qr-frame mx-auto my-2 w-64 rounded-lg bg-white p-3">
				<!-- eslint-disable-next-line svelte/no-at-html-tags - uqr output is generated locally from the report URL, no user HTML -->
				{@html qrSvg}
			</div>
		{/if}

		<p class="text-muted-foreground mx-auto max-w-sm text-center font-mono text-xs break-all">
			{error.slice(0, 160)}
		</p>

		{#if report && reportUrl}
			<div class="mt-2 flex flex-col gap-2">
				<Button href={githubIssueUrl(report, reportUrl)} target="_blank" variant="default">
					<Bug class="mr-2 h-4 w-4" />
					Open a GitHub issue
				</Button>

				<Button href={supportMailUrl(report, reportUrl)} variant="secondary">
					<Mail class="mr-2 h-4 w-4" />
					Email hello@tiles.run
				</Button>

				<Button onclick={copyLink} variant="ghost">
					<Copy class="mr-2 h-4 w-4" />
					{copied ? 'Copied' : 'Copy report link'}
				</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	/* the svg scales to its box; white quiet zone keeps phone cameras happy */
	.qr-frame :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
