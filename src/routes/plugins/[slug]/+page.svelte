<script lang="ts">
	import { ArrowLeft, ArrowUpRight, BookOpen, Check, Copy, Server } from '@lucide/svelte';
	import { page } from '$app/state';
	import { PluginIcon } from '$lib/components/app';
	import { ROUTES } from '$lib/constants';
	import { getTilesPlugin } from '$lib/plugins';

	let copiedCommand = $state(false);
	let copiedUsageCommand = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	let plugin = $derived(getTilesPlugin(page.params.slug ?? ''));
	let usageCommand = $derived(plugin ? `@${plugin.slug}` : '');

	function copyText(text: string) {
		const copyWithTextArea = () => {
			const textArea = document.createElement('textarea');

			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.opacity = '0';
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
		};

		if (!navigator.clipboard?.writeText) {
			copyWithTextArea();

			return;
		}

		void navigator.clipboard.writeText(text).catch(copyWithTextArea);
	}

	function copyCommand() {
		if (!plugin) return;

		copyText(plugin.installCommand);
		copiedCommand = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copiedCommand = false), 1400);
	}

	function copyUsageCommand() {
		copyText(usageCommand);
		copiedUsageCommand = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copiedUsageCommand = false), 1400);
	}

	function metadataLabel(key: string) {
		if (key === '$schema') return 'Schema';

		return key
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/^./, (character) => character.toUpperCase());
	}
</script>

<svelte:head>
	<title>{plugin ? `${plugin.name} | Tiles Plugins` : 'Plugin not found | Tiles'}</title>

	{#if plugin}
		<meta content={plugin.description} name="description" />
	{/if}
</svelte:head>

<main class="min-h-dvh px-5 py-20 sm:px-8 md:py-24 lg:px-12">
	<div class="mx-auto w-full max-w-3xl">
		<section class="min-w-0">
			<a
				class="mb-8 inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
				href={ROUTES.PLUGINS}
			>
				<ArrowLeft aria-hidden="true" class="h-5 w-5" />

				Back
			</a>

			{#if plugin}
				<div class="mb-7 flex flex-col gap-6">
					<div class="flex shrink-0 items-center gap-4">
						<span
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground ring-1 ring-border/60"
						>
							<PluginIcon class="h-5 w-5" slug={plugin.slug} />
						</span>

						<h1 class="truncate text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
							{plugin.name}
						</h1>
					</div>

					<button
						aria-label={copiedCommand
							? 'Install command copied'
							: `Copy install command for ${plugin.name}`}
						class="flex min-h-12 w-full min-w-0 items-center justify-between gap-4 rounded-lg bg-secondary/65 px-4 py-3 text-left transition-colors hover:bg-secondary"
						onclick={copyCommand}
						type="button"
					>
						<code class="min-w-0 overflow-x-auto text-sm whitespace-nowrap">
							<span aria-hidden="true" class="mr-2 text-muted-foreground select-none">$</span>
							{plugin.installCommand}
						</code>

						{#if copiedCommand}
							<Check aria-hidden="true" class="h-4 w-4 shrink-0 text-signal" />
						{:else}
							<Copy aria-hidden="true" class="h-4 w-4 shrink-0 text-muted-foreground" />
						{/if}
					</button>
				</div>

				<p class="mb-10 max-w-3xl text-base leading-7 text-muted-foreground sm:text-[1.05rem]">
					{plugin.description}
				</p>

				<div class="mb-12">
					<h2 class="mb-3 text-xl font-semibold tracking-tight">Usage</h2>

					<button
						aria-label={copiedUsageCommand
							? 'Usage command copied'
							: `Copy usage command for ${plugin.name}`}
						class="flex min-h-12 w-full min-w-0 items-center justify-between gap-4 rounded-lg bg-secondary/65 px-4 py-3 text-left transition-colors hover:bg-secondary"
						onclick={copyUsageCommand}
						type="button"
					>
						<code class="min-w-0 overflow-x-auto text-sm whitespace-nowrap">
							<span aria-hidden="true" class="mr-2 text-muted-foreground select-none">&gt;</span>
							{usageCommand}
						</code>

						{#if copiedUsageCommand}
							<Check aria-hidden="true" class="h-4 w-4 shrink-0 text-signal" />
						{:else}
							<Copy aria-hidden="true" class="h-4 w-4 shrink-0 text-muted-foreground" />
						{/if}
					</button>
				</div>

				{#if plugin.mcpServers.length > 0}
					<div class="mb-12">
						<div class="mb-4 flex items-center justify-between gap-4">
							<h2 class="text-xl font-semibold tracking-tight">
								MCP <span class="text-muted-foreground/55">{plugin.mcpServers.length}</span>
							</h2>

							<a
								class="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
								href={`${plugin.sourceUrl}/mcp.json`}
								rel="noreferrer"
								target="_blank"
							>
								View mcp.json
								<ArrowUpRight aria-hidden="true" class="h-3.5 w-3.5" />
							</a>
						</div>

						<div class="overflow-hidden rounded-lg bg-secondary/65">
							{#each plugin.mcpServers as server (server.name)}
								<div class="flex min-h-19 items-center gap-3 px-4 py-4">
									<span
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground/55 shadow-sm ring-1 ring-border/60"
									>
										<Server aria-hidden="true" class="h-5 w-5" />
									</span>

									<span class="min-w-0 flex-1">
										<span class="block truncate text-[17px] leading-5 font-medium text-foreground">
											{server.name}
										</span>

										<span class="mt-0.5 block truncate text-sm leading-5 text-muted-foreground">
											{[server.type, server.endpoint].filter(Boolean).join(' · ')}
										</span>
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="mb-12">
					<h2 class="mb-4 text-xl font-semibold tracking-tight">
						Skills <span class="text-muted-foreground/55">{plugin.skills.length}</span>
					</h2>

					<div class="overflow-hidden rounded-lg bg-secondary/65">
						{#each plugin.skills as skill (skill.sourceUrl)}
							<a
								class="group flex min-h-19 items-center gap-3 px-4 py-4 transition-colors hover:bg-secondary"
								href={skill.sourceUrl}
								rel="noreferrer"
								target="_blank"
							>
								<span
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground/55 shadow-sm ring-1 ring-border/60"
								>
									{#if plugin.slug === 'caldir'}
										<PluginIcon class="h-5 w-5" slug={plugin.slug} />
									{:else}
										<BookOpen aria-hidden="true" class="h-5 w-5" />
									{/if}
								</span>

								<span class="min-w-0 flex-1">
									<span class="block truncate text-[17px] leading-5 font-medium text-foreground">
										{skill.name}
									</span>

									<span class="mt-0.5 block truncate text-sm leading-5 text-muted-foreground">
										{skill.description}
									</span>
								</span>

								<ArrowUpRight
									aria-hidden="true"
									class="h-4 w-4 shrink-0 text-muted-foreground/55 transition-colors group-hover:text-foreground"
								/>
							</a>
						{/each}
					</div>
				</div>

				<div>
					<div class="mb-4 flex items-center justify-between gap-4">
						<h2 class="text-xl font-semibold tracking-tight">Plugin metadata</h2>

						<a
							class="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
							href={`${plugin.sourceUrl}/plugin.json`}
							rel="noreferrer"
							target="_blank"
						>
							View plugin.json
							<ArrowUpRight aria-hidden="true" class="h-3.5 w-3.5" />
						</a>
					</div>

					<dl class="overflow-hidden rounded-lg bg-secondary/65">
						{#each plugin.metadata as field (field.key)}
							<div
								class="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-b border-border/55 px-4 py-3 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)]"
							>
								<dt class="text-sm font-medium text-muted-foreground">
									{metadataLabel(field.key)}
								</dt>

								<dd class="min-w-0 text-sm break-words text-foreground">
									{#if field.href}
										<a
											class="underline decoration-current/35 underline-offset-4 transition-opacity hover:opacity-75"
											href={field.href}
											rel="noreferrer"
											target="_blank"
										>
											{field.value}
										</a>
									{:else}
										{field.value}
									{/if}
								</dd>
							</div>
						{/each}
					</dl>
				</div>
			{:else}
				<h1 class="text-3xl font-semibold tracking-tight">Plugin not found</h1>

				<p class="mt-3 text-muted-foreground">This plugin is not in the Tiles catalog.</p>
			{/if}
		</section>
	</div>
</main>
