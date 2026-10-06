<script lang="ts">
	import { ChevronDown, ChevronRight, LoaderCircle, Plus } from '@lucide/svelte';
	import { PluginControls, PluginIcon, PluginNotice } from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { getTilesPlugin, TILES_PLUGINS } from '$lib/plugins';
	import { pluginsStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let query = $state('');
	let source = $state('');
	let addOpen = $state(false);

	onMount(() => {
		void pluginsStore.refresh();
	});

	async function installFromSource(event: SubmitEvent) {
		event.preventDefault();

		if (await pluginsStore.install(source)) {
			source = '';
			addOpen = false;
		}
	}

	const normalizedQuery = $derived(query.trim().toLowerCase());
	// names only: a letter or two is in nearly every description
	const filteredPlugins = $derived(
		TILES_PLUGINS.filter((plugin) =>
			[plugin.name, plugin.slug].join(' ').toLowerCase().includes(normalizedQuery)
		)
	);
	const showMakeYourOwnPluginCard = $derived(
		!normalizedQuery || ' make your own plugin mcp servers skills'.includes(` ${normalizedQuery}`)
	);
</script>

<svelte:head>
	<title>Plugins | Tiles</title>

	<meta
		content="Extend Tiles with portable skills and MCP servers using the open Agent Plugins standard."
		name="description"
	/>
</svelte:head>

<main class="min-h-dvh px-5 pt-20 pb-32 sm:px-8 md:pt-24 lg:px-12">
	<div class="mx-auto w-full max-w-3xl">
		<section class="min-w-0">
			<div class="mb-12 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
				<div class="min-w-0 flex-1">
					<h1 class="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Extend the Agent</h1>

					<p class="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
						Tiles plugins follow the open
						<a
							class="text-foreground underline decoration-current/35 underline-offset-4 transition-opacity hover:opacity-75"
							href="https://agent-plugins.org/"
							rel="noopener noreferrer"
							target="_blank"
						>
							Agent Plugins standard
						</a>, a portable package format for reusable components that extend AI agents.
					</p>
				</div>

				{#if pluginsStore.available}
					<Popover.Root bind:open={addOpen}>
						<Popover.Trigger
							class="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							Add
							<ChevronDown aria-hidden="true" class="h-4 w-4" />
						</Popover.Trigger>

						<Popover.Content
							align="end"
							class="w-[min(26rem,calc(100vw-2rem))] border-border bg-popover p-4"
							sideOffset={8}
						>
							<form onsubmit={installFromSource}>
								<h2 class="text-base font-semibold tracking-tight">Upload plugin archive</h2>

								<p class="mt-1 text-sm leading-5 text-muted-foreground">
									Install a compatible .zip plugin archive from a URL or local path.

									<a
										class="text-foreground underline decoration-current/35 underline-offset-4 transition-opacity hover:opacity-75"
										href="https://www.tiles.run/book/manual#plugin-package-layout"
										rel="noopener noreferrer"
										target="_blank"
									>
										Learn More
									</a>
								</p>

								<label class="mt-4 block">
									<span class="sr-only">Plugin archive URL or local path</span>

									<input
										bind:value={source}
										class="h-10 w-full rounded-lg border-0 bg-secondary/65 px-4 text-sm text-foreground ring-1 ring-border/60 outline-none transition-colors placeholder:text-muted-foreground/75 focus:bg-secondary focus:ring-ring"
										disabled={pluginsStore.installing}
										placeholder="Plugin archive URL or local path"
										type="text"
									/>
								</label>

								<Button
									class="mt-3 w-full"
									disabled={pluginsStore.installing || !source.trim()}
									type="submit"
								>
									{#if pluginsStore.installing}
										<LoaderCircle class="animate-spin" />
										Installing
									{:else}
										Install archive
									{/if}
								</Button>
							</form>
						</Popover.Content>
					</Popover.Root>
				{/if}
			</div>

			{#if pluginsStore.available}
				<div class="mb-12">
					<h2 class="mb-4 flex items-baseline gap-2 text-xl font-semibold tracking-tight">
						Installed <span class="text-muted-foreground/55 tabular-nums"
							>{pluginsStore.plugins.length}</span
						>
					</h2>

					{#if pluginsStore.plugins.length > 0}
						<div class="overflow-hidden rounded-lg bg-secondary/65">
							{#each pluginsStore.plugins as installed (installed.name)}
								{@const listed = getTilesPlugin(installed.name)}
								<div
									class="flex min-h-19 items-center gap-3 border-b border-border/55 px-4 py-4 last:border-b-0"
								>
									<span
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm ring-1 ring-border/60 {installed.enabled
											? ''
											: 'opacity-50'}"
									>
										<PluginIcon class="h-5 w-5" slug={installed.name} />
									</span>

									<span class="min-w-0 flex-1 {installed.enabled ? '' : 'opacity-60'}">
										{#if listed}
											<a
												class="block truncate text-[17px] leading-5 font-medium text-foreground hover:underline"
												href={`/plugins/${listed.slug}`}
											>
												{listed.name}
											</a>
										{:else}
											<span
												class="block truncate text-[17px] leading-5 font-medium text-foreground"
											>
												{installed.name}
											</span>
										{/if}

										<span class="mt-0.5 block truncate text-sm leading-5 text-muted-foreground">
											{installed.description || listed?.description || ''}
										</span>
									</span>

									<PluginControls name={installed.name} />
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 class="flex items-baseline gap-2 text-xl font-semibold tracking-tight">
					Discover <span class="text-muted-foreground/55 tabular-nums"
						>{filteredPlugins.length}</span
					>
				</h2>

				<label class="relative block w-full sm:w-72 sm:shrink-0">
					<span class="sr-only">Search plugins</span>

					<input
						bind:value={query}
						class="h-10 w-full rounded-full border-0 bg-secondary/65 px-5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/75 focus:bg-secondary focus:ring-1 focus:ring-ring"
						placeholder="Search plugins"
						type="search"
					/>
				</label>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				{#each filteredPlugins as plugin (plugin.slug)}
					{@const installed = pluginsStore.byName(plugin.slug)}
					<a
						class="group flex h-19 items-center gap-3 overflow-hidden rounded-lg bg-secondary/65 px-4 py-4 text-card-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						href={`/plugins/${plugin.slug}`}
					>
						<span
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm ring-1 ring-border/60"
						>
							<PluginIcon class="h-5 w-5" slug={plugin.slug} />
						</span>

						<span class="min-w-0 flex-1 overflow-hidden">
							<span class="flex items-center gap-2">
								<span class="truncate text-[17px] leading-5 font-medium text-foreground">
									{plugin.name}
								</span>

								{#if installed}
									<span
										class="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] leading-4 text-muted-foreground ring-1 ring-border/60"
									>
										{installed.enabled ? 'Installed' : 'Disabled'}
									</span>
								{/if}
							</span>

							<span class="mt-0.5 block truncate text-sm leading-5 text-muted-foreground">
								{plugin.description}
							</span>
						</span>

						<ChevronRight
							aria-hidden="true"
							class="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
						/>
					</a>
				{/each}

				{#if showMakeYourOwnPluginCard}
					<a
						class="group flex h-19 items-center gap-3 overflow-hidden rounded-lg bg-secondary/65 px-4 py-4 text-card-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						href="https://tiles.run/book/manual#plugin-package-layout"
						rel="noopener noreferrer"
						target="_blank"
					>
						<span
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm ring-1 ring-border/60"
						>
							<Plus aria-hidden="true" class="h-5 w-5" strokeWidth={1.75} />
						</span>

						<span class="min-w-0 flex-1 overflow-hidden">
							<span class="block truncate text-[17px] leading-5 font-medium text-foreground">
								Make your own plugin
							</span>

							<span class="mt-0.5 block truncate text-sm leading-5 text-muted-foreground">
								Bundle MCP servers and skills in the portable Agent Plugins format.
							</span>
						</span>

						<ChevronRight
							aria-hidden="true"
							class="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
						/>
					</a>
				{/if}
			</div>

			{#if filteredPlugins.length === 0 && !showMakeYourOwnPluginCard}
				<div class="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
					No plugins match that search.
				</div>
			{/if}
		</section>
	</div>
</main>

<PluginNotice />
