<script lang="ts">
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';
	import {
		CONTEXT_STOPS,
		canBeAutomatic,
		changed,
		defaultLabel,
		inUse,
		kilo,
		nearestStop,
		refusal
	} from '#lib/inference.ts';
	import { inference } from '#lib/state/inference.svelte.ts';
	import { toasts } from '#lib/state/toasts.svelte.ts';
	import type { LlamaSetting } from '#lib/types.ts';

	const CONTEXT = 'context_length';
	// which settings sit together. one the daemon adds later lands in Other
	const GROUPS: [string, string[]][] = [
		['GPU', ['gpu_layers', 'offload_kqv', 'flash_attn', 'n_cpu_moe']],
		['Memory and speed', ['load_mode', 'batch_size', 'context_checkpoints', 'mtp']]
	];
	const LAST_STOP = CONTEXT_STOPS.length - 1;

	let advanced = $state(false);
	// the stop under the knob while it's dragged
	let dragged = $state<number | null>(null);
	// the choice whose menu is open
	let menu = $state<string | null>(null);
	// a number while it's typed, and why the last one couldn't be saved
	let typed = $state<Record<string, string>>({});
	let refused = $state<Record<string, string>>({});
	// a number taken off automatic that has no value yet
	let manual = $state<Record<string, boolean>>({});

	const settings = $derived(inference.settings ?? []);
	const context = $derived(settings.find((s) => s.name === CONTEXT));
	const rest = $derived(settings.filter((s) => s.name !== CONTEXT));
	const restChanged = $derived(rest.filter(changed).length);
	const groups = $derived.by(() => {
		const placed = GROUPS.flatMap(([, names]) => names);
		const named = GROUPS.map(([title, names]) => ({
			title,
			settings: names.flatMap((name) => rest.filter((s) => s.name === name))
		}));
		const other = { title: 'Other', settings: rest.filter((s) => !placed.includes(s.name)) };
		return [...named, other].filter((group) => group.settings.length);
	});

	const contextSize = $derived(context ? Number(inUse(context)) : CONTEXT_STOPS[0]);
	const stop = $derived(dragged ?? nearestStop(contextSize));
	const contextShown = $derived(kilo(dragged === null ? contextSize : CONTEXT_STOPS[dragged]));

	inference.load();

	async function act(work: () => Promise<unknown>) {
		try {
			await work();
		} catch (err) {
			toasts.show((err as Error).message);
		}
	}

	function forget(name: string) {
		delete typed[name];
		delete refused[name];
		delete manual[name];
	}

	function reset(setting: LlamaSetting) {
		forget(setting.name);
		return act(() => inference.reset(setting.name));
	}

	// saved when the knob is let go, not at every stop it passes
	async function dropKnob() {
		if (dragged === null) return;
		const size = CONTEXT_STOPS[dragged];
		if (size !== contextSize) await act(() => inference.set(CONTEXT, size));
		dragged = null;
	}

	async function flip(setting: LlamaSetting, box: HTMLInputElement) {
		try {
			await inference.set(setting.name, box.checked);
		} catch (err) {
			box.checked = !box.checked;
			toasts.show((err as Error).message);
		}
	}

	const isAutomatic = (setting: LlamaSetting) =>
		canBeAutomatic(setting) && setting.value === null && !manual[setting.name];

	// off waits for a number, nothing is saved until one is typed
	async function setAutomatic(setting: LlamaSetting, box: HTMLInputElement) {
		if (!box.checked) {
			manual[setting.name] = true;
			await tick();
			box.closest('.control')?.querySelector<HTMLInputElement>('.number')?.focus();
			return;
		}
		forget(setting.name);
		if (setting.value === null) return;
		try {
			await inference.reset(setting.name);
		} catch (err) {
			box.checked = false;
			toasts.show((err as Error).message);
		}
	}

	const fieldValue = (setting: LlamaSetting) =>
		typed[setting.name] ?? (isAutomatic(setting) || manual[setting.name] ? '' : inUse(setting));

	function commit(setting: LlamaSetting) {
		const { name } = setting;
		const text = typed[name]?.trim();
		delete typed[name];
		delete refused[name];
		// left as it was, or emptied
		if (!text || text === inUse(setting)) return;
		const why = refusal(text, setting.min);
		if (why) {
			typed[name] = text;
			refused[name] = `${why}. Still using ${inUse(setting)}.`;
			return;
		}
		delete manual[name];
		act(() => inference.set(name, Number(text)));
	}

	const chosen = (setting: LlamaSetting) =>
		setting.choices?.find((c) => c.value === inUse(setting))?.label ?? inUse(setting);

	function pick(setting: LlamaSetting, value: string) {
		menu = null;
		if (value !== inUse(setting)) act(() => inference.set(setting.name, value));
	}

	// Escape closes the menu and leaves the dialog open
	function closeMenu(e: KeyboardEvent) {
		if (e.key !== 'Escape' || !menu) return;
		e.preventDefault();
		e.stopPropagation();
		const picker = (e.currentTarget as HTMLElement).closest('.picker');
		menu = null;
		picker?.querySelector<HTMLButtonElement>('.pick')?.focus();
	}

	// a menu opening past the edge of the scroll area is scrolled into it
	const reveal = (node: HTMLElement) => node.scrollIntoView({ block: 'nearest' });
</script>

{#snippet resetButton(setting: LlamaSetting, to: string)}
	<button
		type="button"
		class="icon tile row-tile"
		aria-label="Reset {setting.label} to {to}"
		title="Reset to {to}"
		onclick={() => reset(setting)}><Icon name="undo" size={14} /></button
	>
{/snippet}

{#snippet row(setting: LlamaSetting)}
	{@const id = `setting-${setting.name}`}
	{@const why = refused[setting.name]}
	<div class="row">
		<label for={id}>
			{setting.label}
			{#if setting.help !== setting.label}<small class="muted">{setting.help}</small>{/if}
			{#if changed(setting)}<small class="was">Default {defaultLabel(setting)}</small>{/if}
			{#if why}<small id="{id}-why" class="error" role="alert">{why}</small>{/if}
		</label>
		<span class="control">
			{#if changed(setting)}{@render resetButton(setting, defaultLabel(setting))}{/if}
			{#if setting.kind === 'flag'}
				<input
					{id}
					type="checkbox"
					role="switch"
					checked={inUse(setting) === 'true'}
					onchange={(e) => flip(setting, e.currentTarget)}
				/>
			{:else if setting.kind === 'choice'}
				<div
					class="picker"
					onfocusout={(e) => {
						if (!e.currentTarget.contains(e.relatedTarget as Node)) menu = null;
					}}
				>
					<button
						{id}
						type="button"
						class="pick tile"
						aria-haspopup="listbox"
						aria-expanded={menu === setting.name}
						onclick={() => (menu = menu === setting.name ? null : setting.name)}
						onkeydown={closeMenu}
					>
						<span>{chosen(setting)}</span>
						<Icon name="chevron" size={12} />
					</button>
					{#if menu === setting.name}
						<ul class="tile" role="listbox" aria-label={setting.label} use:reveal>
							{#each setting.choices ?? [] as choice (choice.value)}
								{@const picked = choice.value === inUse(setting)}
								<li role="option" aria-selected={picked}>
									<button
										type="button"
										class="tile row-tile"
										class:on={picked}
										onclick={() => pick(setting, choice.value)}
										onkeydown={closeMenu}
									>
										<span>
											{choice.label}{#if choice.value === setting.default}<span class="tag"
													>Default</span
												>{/if}
										</span>
										<span class="mono muted">{choice.value}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else}
				{#if canBeAutomatic(setting)}
					<label class="auto">
						Auto
						<input
							type="checkbox"
							role="switch"
							checked={isAutomatic(setting)}
							onchange={(e) => setAutomatic(setting, e.currentTarget)}
						/>
					</label>
				{/if}
				<input
					{id}
					class="field number mono"
					type="text"
					inputmode="numeric"
					autocomplete="off"
					spellcheck="false"
					value={fieldValue(setting)}
					placeholder={canBeAutomatic(setting) ? setting.default : undefined}
					disabled={isAutomatic(setting)}
					aria-invalid={why ? 'true' : undefined}
					aria-describedby={why ? `${id}-why` : undefined}
					oninput={(e) => {
						typed[setting.name] = e.currentTarget.value;
						delete refused[setting.name];
					}}
					onblur={() => commit(setting)}
					onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
				/>
			{/if}
		</span>
	</div>
{/snippet}

{#if inference.reason && !inference.settings}
	<p class="error">{inference.reason}</p>
	<button class="plate" onclick={() => inference.load()}>Try again</button>
{:else if inference.settings}
	<p class="note muted">A change applies from your next message, after the model reloads.</p>

	{#if context}
		<div class="context">
			<div class="head">
				<label for="context-length">{context.label}</label>
				<span class="control">
					{#if changed(context) && dragged === null}
						{@render resetButton(context, kilo(Number(context.default)))}
					{/if}
					<output class="mono" for="context-length">{contextShown}</output>
				</span>
			</div>
			<small class="muted">
				Size of the context window. Larger uses more memory.
				{#if changed(context)}<span class="was">Default {kilo(Number(context.default))}</span>{/if}
			</small>
			<div class="slider" style:--at={stop / LAST_STOP}>
				<span class="ticks" aria-hidden="true">
					{#each CONTEXT_STOPS as size, i (size)}
						<i style:left="{(i / LAST_STOP) * 100}%"></i>
					{/each}
				</span>
				<input
					id="context-length"
					type="range"
					min="0"
					max={LAST_STOP}
					step="1"
					value={stop}
					aria-valuetext={contextShown}
					oninput={(e) => (dragged = Number(e.currentTarget.value))}
					onchange={dropKnob}
				/>
			</div>
			<div class="stops mono" aria-hidden="true">
				{#each CONTEXT_STOPS as size, i (size)}
					<span class:on={i === stop} style:left="{(i / LAST_STOP) * 100}%">{kilo(size)}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if rest.length}
		<button
			type="button"
			class="advanced"
			aria-expanded={advanced}
			aria-controls="advanced-settings"
			onclick={() => (advanced = !advanced)}
		>
			<span><Icon name="chevron" size={14} />Advanced</span>
			<span class="count" class:some={restChanged > 0}>
				{restChanged ? `${restChanged} changed` : `${rest.length} settings`}
			</span>
		</button>
		{#if advanced}
			<div id="advanced-settings">
				{#each groups as group (group.title)}
					<h4>{group.title}</h4>
					{#each group.settings as setting (setting.name)}
						{@render row(setting)}
					{/each}
				{/each}
			</div>
		{/if}
	{/if}
{:else}
	<span class="spin"></span>
{/if}

<style>
	.note {
		max-width: 62ch;
		font-size: var(--fs-body);
	}

	small {
		display: block;
		font-size: var(--fs-body);
	}

	.was {
		color: var(--ash);
	}

	.control {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* the one setting most people change, above the rest */
	.context {
		margin-top: 6px;
		padding: 14px 0 16px;
		border-bottom: var(--hairline) solid var(--rule);
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		/* as tall as the reset button, so the row keeps its height when it shows */
		min-height: 28px;
	}

	.context small .was {
		margin-left: 4px;
	}

	output {
		font-size: var(--fs-body);
	}

	/* the knob's centre stops on each tick, half a knob in from either end */
	.slider {
		--knob: 13px;
		position: relative;
		height: 17px;
		margin-top: 12px;
	}

	.slider::before,
	.slider::after {
		content: '';
		position: absolute;
		top: 7px;
		left: 0;
		height: 3px;
		pointer-events: none;
	}

	.slider::before {
		right: 0;
		background: var(--lift);
	}

	.slider::after {
		width: calc(var(--knob) / 2 + (100% - var(--knob)) * var(--at));
		background: var(--signal);
	}

	.ticks {
		position: absolute;
		inset: 4px calc(var(--knob) / 2);
	}

	.ticks i {
		position: absolute;
		top: 0;
		width: 1px;
		height: 9px;
		margin-left: -0.5px;
		background: var(--edge);
	}

	input[type='range'] {
		appearance: none;
		position: relative;
		z-index: 1;
		display: block;
		width: 100%;
		height: 17px;
		background: none;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-runnable-track {
		height: 17px;
		background: none;
	}

	input[type='range']::-moz-range-track {
		height: 17px;
		background: none;
	}

	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: var(--knob);
		height: var(--knob);
		margin-top: 2px;
		border: 0;
		border-radius: 0;
		background: var(--signal);
	}

	input[type='range']::-moz-range-thumb {
		width: var(--knob);
		height: var(--knob);
		border: 0;
		border-radius: 0;
		background: var(--signal);
	}

	.stops {
		position: relative;
		height: 16px;
		margin: 6px 6.5px 0;
		font-size: var(--fs-label);
		color: var(--slate);
	}

	.stops span {
		position: absolute;
		translate: -50% 0;
	}

	.stops .on {
		color: var(--bone);
	}

	.advanced {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 13px 0;
		border-bottom: var(--hairline) solid var(--rule);
		text-align: left;
	}

	.advanced span:first-child {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.advanced :global(svg) {
		color: var(--slate);
		transition: rotate var(--dur-state) var(--ease-push);
	}

	.advanced[aria-expanded='false'] :global(svg) {
		rotate: -90deg;
	}

	.advanced:hover :global(svg) {
		color: var(--bone);
	}

	.count {
		font-size: var(--fs-body);
		color: var(--slate);
	}

	.count.some {
		color: var(--ash);
	}

	h4 {
		padding: 18px 0 2px;
		font-size: var(--fs-body);
		font-weight: 500;
		color: var(--slate);
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 11px 0;
		border-bottom: var(--hairline) solid var(--rule);
	}

	.row > label {
		min-width: 0;
	}

	.row:has(input[role='switch']) > label,
	.auto {
		cursor: pointer;
	}

	.auto {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--fs-body);
		color: var(--ash);
	}

	.number {
		width: 104px;
		padding: 7px 10px;
		font-size: var(--fs-body);
		text-align: right;
	}

	.auto + .number {
		width: 72px;
	}

	.number:disabled {
		color: var(--slate);
	}

	.number[aria-invalid='true'] {
		--line: var(--alert);
	}

	.icon {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		color: var(--ash);
	}

	.icon:hover {
		background-color: var(--steel);
		color: var(--bone);
	}

	.picker {
		position: relative;
	}

	.pick {
		width: 170px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 7px 10px;
		background-color: var(--steel);
		font-size: var(--fs-body);
		text-align: left;
	}

	.pick :global(svg) {
		flex: none;
		color: var(--slate);
	}

	.pick:hover,
	.pick[aria-expanded='true'] {
		--line: var(--edge);
	}

	.pick[aria-expanded='true'] {
		background-color: var(--lift);
	}

	.pick[aria-expanded='true'] :global(svg) {
		rotate: 180deg;
	}

	/* opens upward, the row sits in the lower half of the list */
	ul {
		--r: var(--radius-m);
		--line: var(--edge);
		position: absolute;
		right: 0;
		bottom: calc(100% + 6px);
		z-index: 10;
		width: 290px;
		display: grid;
		gap: 2px;
		padding: 4px;
		list-style: none;
		background-color: var(--panel);
		box-shadow: var(--shadow-float);
		font-size: var(--fs-body);
	}

	li button {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 7px 10px;
		color: var(--ash);
		text-align: left;
	}

	li button:is(:hover, :focus-visible, .on) {
		background-color: var(--steel);
		color: var(--bone);
	}

	li .mono {
		font-size: var(--fs-label);
	}

	.tag {
		margin-left: 8px;
		font-size: var(--fs-label);
		color: var(--slate);
	}
</style>
