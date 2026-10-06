# Plugin catalog synchronization

- Treat `/Users/feynon/Projects/tiles-next/lib/plugins.ts` as the canonical source for the public plugin directory mirrored by `src/lib/plugins.ts`.
- Before changing plugin entries, fetch `origin/main` in `/Users/feynon/Projects/tiles-next`, confirm the checkout matches it, and compare the rendered directory at `https://www.tiles.run/plugins`.
- Keep curated entry order, names, descriptions, archive and install URLs, metadata, MCP servers, skills, source and documentation links, and plugin icon assets synchronized with that source. The live page may resolve fresher manifest and skill content than fallback data in `tiles-next`; use the published value when they differ.
- Preserve `tiles-ui`-specific installed, enabled, disabled, and uninstall controls when synchronizing discovery entries.
