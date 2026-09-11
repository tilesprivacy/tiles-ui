<script lang="ts">
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { EditorState, RangeSetBuilder, Transaction } from '@codemirror/state';
	import {
		Decoration,
		type DecorationSet,
		drawSelection,
		EditorView,
		keymap,
		ViewPlugin,
		type ViewUpdate
	} from '@codemirror/view';
	import { onMount } from 'svelte';

	interface Props {
		id: string;
		onChange: (value: string) => void;
		value: string;
	}

	type TokenKind = 'attribute' | 'comment' | 'keyword' | 'literal' | 'string';
	type TokenRange = { from: number; kind: TokenKind; to: number };

	const DIRECTIVE = /^(\s*)(FROM|PARAMETER|TEMPLATE|SYSTEM|ADAPTER|LICENSE|MESSAGE)\b(.*)$/i;
	const SCALAR = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

	const tokenDecorations: Record<TokenKind, Decoration> = {
		attribute: Decoration.mark({ class: 'cm-modelfile-attribute' }),
		comment: Decoration.mark({ class: 'cm-modelfile-comment' }),
		keyword: Decoration.mark({ class: 'cm-modelfile-keyword' }),
		literal: Decoration.mark({ class: 'cm-modelfile-literal' }),
		string: Decoration.mark({ class: 'cm-modelfile-string' })
	};

	let { id, onChange, value }: Props = $props();
	let editorHost: HTMLDivElement | null = $state(null);
	let editorView: EditorView | null = $state(null);

	function pushRange(ranges: TokenRange[], from: number, to: number, kind: TokenKind) {
		if (to > from) ranges.push({ from, kind, to });
	}

	function tokenizePayload(
		ranges: TokenRange[],
		directive: string,
		payload: string,
		payloadOffset: number
	) {
		const leadingLength = payload.match(/^\s*/)?.[0].length ?? 0;
		const content = payload.slice(leadingLength);
		const contentOffset = payloadOffset + leadingLength;

		if (!content) return;

		if (directive === 'PARAMETER' || directive === 'MESSAGE') {
			const match = /^(\S+)(\s+)(.*)$/.exec(content);

			if (!match) {
				pushRange(ranges, contentOffset, contentOffset + content.length, 'attribute');

				return;
			}

			pushRange(ranges, contentOffset, contentOffset + match[1].length, 'attribute');

			const valueOffset = contentOffset + match[1].length + match[2].length;
			const valueKind =
				directive === 'PARAMETER' && (SCALAR.test(match[3]) || /^(true|false)$/i.test(match[3]))
					? 'literal'
					: 'string';

			pushRange(ranges, valueOffset, valueOffset + match[3].length, valueKind);

			return;
		}

		pushRange(
			ranges,
			contentOffset,
			contentOffset + content.length,
			directive === 'FROM' || directive === 'ADAPTER' ? 'attribute' : 'string'
		);
	}

	function tokenizeModelfile(source: string): TokenRange[] {
		const ranges: TokenRange[] = [];

		let lineOffset = 0;
		let inMultilineString = false;

		for (const line of source.split('\n')) {
			if (inMultilineString) {
				pushRange(ranges, lineOffset, lineOffset + line.length, 'string');

				if ((line.match(/"""/g)?.length ?? 0) % 2 === 1) inMultilineString = false;
			} else if (/^\s*#/.test(line)) {
				pushRange(ranges, lineOffset, lineOffset + line.length, 'comment');
			} else {
				const match = DIRECTIVE.exec(line);

				if (match) {
					const directive = match[2].toUpperCase();
					const directiveOffset = lineOffset + match[1].length;
					const payloadOffset = directiveOffset + match[2].length;

					pushRange(ranges, directiveOffset, payloadOffset, 'keyword');
					tokenizePayload(ranges, directive, match[3], payloadOffset);

					if ((match[3].match(/"""/g)?.length ?? 0) % 2 === 1) inMultilineString = true;
				}
			}

			lineOffset += line.length + 1;
		}

		return ranges;
	}

	function buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

		for (const range of tokenizeModelfile(view.state.doc.toString())) {
			builder.add(range.from, range.to, tokenDecorations[range.kind]);
		}

		return builder.finish();
	}

	const syntaxHighlighting = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged) this.decorations = buildDecorations(update.view);
			}
		},
		{ decorations: (plugin) => plugin.decorations }
	);

	const editorTheme = EditorView.theme(
		{
			'&': {
				backgroundColor: 'transparent',
				color: 'var(--foreground)',
				fontSize: '0.75rem',
				minHeight: '22rem'
			},
			'&.cm-focused': { outline: 'none' },
			'.cm-content': {
				caretColor: 'var(--foreground)',
				fontFamily: 'var(--font-mono)',
				lineHeight: '1.25rem',
				minHeight: '22rem',
				padding: '0.5rem 0.75rem'
			},
			'.cm-cursor': { borderLeftColor: 'var(--foreground)' },
			'.cm-modelfile-attribute': { color: '#d2a8ff' },
			'.cm-modelfile-comment': { color: '#8b949e', fontStyle: 'italic' },
			'.cm-modelfile-keyword': { color: '#ff7b72', fontWeight: '600' },
			'.cm-modelfile-literal': { color: '#79c0ff' },
			'.cm-modelfile-string': { color: '#a5d6ff' },
			'.cm-scroller': {
				fontFamily: 'var(--font-mono)',
				overflow: 'auto'
			},
			'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
				backgroundColor: 'color-mix(in srgb, var(--signal) 30%, transparent)'
			}
		},
		{ dark: true }
	);

	onMount(() => {
		if (!editorHost) return;

		editorView = new EditorView({
			parent: editorHost,
			state: EditorState.create({
				doc: value,
				extensions: [
					drawSelection(),
					history(),
					keymap.of([...defaultKeymap, ...historyKeymap]),
					EditorView.lineWrapping,
					EditorView.contentAttributes.of({
						'aria-label': 'Modelfile',
						'aria-multiline': 'true',
						id,
						spellcheck: 'false'
					}),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) onChange(update.state.doc.toString());
					}),
					syntaxHighlighting,
					editorTheme
				]
			})
		});

		return () => {
			editorView?.destroy();
			editorView = null;
		};
	});

	$effect(() => {
		const nextValue = value;
		const view = editorView;

		if (!view || view.state.doc.toString() === nextValue) return;

		view.dispatch({
			annotations: Transaction.addToHistory.of(false),
			changes: { from: 0, insert: nextValue, to: view.state.doc.length }
		});
	});
</script>

<div
	bind:this={editorHost}
	class="modelfile-editor w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 md:max-w-3xl dark:bg-input/30"
></div>
