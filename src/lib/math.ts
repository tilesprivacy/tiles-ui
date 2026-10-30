// KaTeX is big, load it only when a reply has maths
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { MarkedExtension, Tokens } from 'marked';

const render = (tex: string, displayMode: boolean) =>
	katex.renderToString(tex, { displayMode, throwOnError: false, output: 'html' });

// $$…$$ and \[…\] on their own
const block = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])(?:\n|$)/;
// $…$ must hug its content, "$5 and $10" stays text. \(…\) too
const inline = /^(?:\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)|\\\(((?:\\.|[^\\\n])+?)\\\))/;

export const math: MarkedExtension = {
	extensions: [
		{
			name: 'mathBlock',
			level: 'block',
			start: (src) => src.match(/\$\$|\\\[/)?.index,
			tokenizer(src) {
				const match = block.exec(src);
				if (match) return { type: 'mathBlock', raw: match[0], text: match[1] ?? match[2] };
			},
			renderer: (token) => `<div class="math">${render((token as Tokens.Generic).text, true)}</div>`
		},
		{
			name: 'mathInline',
			level: 'inline',
			start: (src) => src.match(/\$|\\\(/)?.index,
			tokenizer(src) {
				const match = inline.exec(src);
				if (match) return { type: 'mathInline', raw: match[0], text: match[1] ?? match[2] };
			},
			renderer: (token) => render((token as Tokens.Generic).text, false)
		}
	]
};
