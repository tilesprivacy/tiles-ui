<script lang="ts">
	import Icon from './Icon.svelte';
	import { api } from '#lib/api.ts';
	import { tiles } from '#lib/state/tiles.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';

	let { id }: { id: string } = $props();

	let open = $state(false);
	let sharing = $state(false);

	const close = (e: KeyboardEvent) => e.key === 'Escape' && (open = false);

	async function share(isPrivate: boolean) {
		open = false;
		sharing = true;
		try {
			const { url } = await api<{ url: string }>(
				`atproto/share-session/${encodeURIComponent(id)}`,
				'POST',
				{ is_private: isPrivate }
			);
			try {
				await navigator.clipboard.writeText(url);
				toasts.show(isPrivate ? 'Private link copied' : 'Public link copied');
			} catch {
				toasts.show(`Shared at ${url}`);
			}
		} catch (err) {
			toasts.show((err as Error).message);
		} finally {
			sharing = false;
		}
	}
</script>

<div
	class="share"
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) open = false;
	}}
>
	<button
		type="button"
		class="chip"
		aria-haspopup="menu"
		aria-expanded={open}
		disabled={!tiles.atproto || sharing}
		title={tiles.atproto ? undefined : 'Sign in to an Atmosphere account in Settings to share'}
		onclick={() => (open = !open)}
		onkeydown={close}
	>
		{#if sharing}<span class="spin"></span>Sharing…{:else}<Icon name="share" size={15} />Share{/if}
	</button>

	{#if open}
		<div class="menu tile" role="menu">
			<button
				type="button"
				class="tile row-tile"
				role="menuitem"
				onclick={() => share(true)}
				onkeydown={close}
			>
				<span>Private link</span>
				<span class="muted">This chat is encrypted. Anyone with the link can read it.</span>
			</button>
			<button
				type="button"
				class="tile row-tile"
				role="menuitem"
				onclick={() => share(false)}
				onkeydown={close}
			>
				<span>Public link</span>
				<span class="muted">Publish this chat to your Atmosphere account for anyone to read.</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.share {
		position: relative;
	}

	.chip {
		gap: 7px;
		padding: 6px 12px;
		font-size: var(--fs-title);
		cursor: pointer;
		background-color: var(--void);
	}

	.chip:disabled {
		cursor: default;
		color: var(--slate);
	}

	.chip :global(svg) {
		color: var(--slate);
	}

	.chip:hover:not(:disabled),
	.chip[aria-expanded='true'] {
		--line: var(--edge);
	}

	.menu {
		--r: var(--radius-m);
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		z-index: 10;
		/* each line of copy on one line */
		width: max-content;
		display: grid;
		gap: 1px;
		padding: 6px;
		background-color: var(--panel);
		font-size: var(--fs-body);
	}

	.menu button {
		display: grid;
		gap: 2px;
		padding: 8px 10px;
		text-align: left;
	}

	.menu button:is(:hover, :focus-visible) {
		background-color: var(--steel);
	}

	.muted {
		font-size: var(--fs-label);
	}

	/* a narrow window has no room for that, the copy wraps */
	@media (max-width: 767px) {
		.menu {
			width: 260px;
		}
	}
</style>
