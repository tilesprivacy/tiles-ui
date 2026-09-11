<script lang="ts">
	import { ChevronRight, Plus } from '@lucide/svelte';
	import { PluginIcon } from '$lib/components/app';
	import { TILES_PLUGINS } from '$lib/plugins';

	let query = $state('');

	const normalizedQuery = $derived(query.trim().toLowerCase());
	const filteredPlugins = $derived(
		TILES_PLUGINS.filter((plugin) =>
			[plugin.name, plugin.description, plugin.slug]
				.join(' ')
				.toLowerCase()
				.includes(normalizedQuery)
		)
	);
	const showMakeYourOwnPluginCard = $derived(
		!normalizedQuery ||
			'make your own plugin bundle mcp servers and skills in the portable agent plugins format package layout'.includes(
				normalizedQuery
			)
	);
</script>

<svelte:head>
	<title>Plugins | Tiles</title>

	<meta
		content="Extend Tiles with portable skills and MCP servers using the open Agent Plugins standard."
		name="description"
	/>
</svelte:head>

<main class="min-h-dvh px-5 py-20 sm:px-8 md:py-24 lg:px-12">
	<div class="mx-auto w-full max-w-3xl">
		<section class="min-w-0">
			<div
				class="mb-12 flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-10"
			>
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

				<label class="relative block w-full md:mt-2 md:w-75 md:shrink-0">
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
							<span class="block truncate text-[17px] leading-5 font-medium text-foreground">
								{plugin.name}
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
