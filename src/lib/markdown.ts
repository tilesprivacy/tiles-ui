import { Marked, type Token, type TokensList } from 'marked';
// every language highlight.js knows, so no fence is left grey
import hljs from 'highlight.js';

const escape = (text: string) => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const safeHref = (href: string) => (/^(https?:|mailto:|#)/i.test(href) ? href : null);

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		// raw HTML in a reply is shown as text, never run
		html: ({ text }) => escape(text),
		link({ href, tokens }) {
			const label = this.parser.parseInline(tokens);
			const url = safeHref(href);
			return url ? `<a href="${escape(url)}" target="_blank" rel="noreferrer">${label}</a>` : label;
		},
		// outside images are blocked, show them as links
		image: ({ href, text }) => {
			const url = safeHref(href);
			return url
				? `<a href="${escape(url)}" target="_blank" rel="noreferrer">${escape(text || url)}</a>`
				: escape(text);
		},
		code({ text, lang }) {
			const name = (lang ?? '').split(/\s/)[0].toLowerCase();
			const body = hljs.getLanguage(name)
				? hljs.highlight(text, { language: name, ignoreIllegals: true }).value
				: escape(text);
			return `<div class="code"><div class="code-head"><span>${escape(name || 'text')}</span><button type="button" data-copy>Copy</button></div><pre><code>${body}</code></pre></div>`;
		}
	}
});

let mathLoaded: Promise<void> | null = null;
// bumped when KaTeX loads, to redo cached blocks
let version = 0;

export const hasMath = (text: string) => /\$\$|\\\[|\\\(|\$\S[^$\n]*\S?\$/.test(text);

export function loadMath() {
	mathLoaded ??= import('./math.ts').then(({ math }) => {
		marked.use(math);
		version++;
	});
	return mathLoaded;
}

// one cache per message, a streaming reply only redoes its last block
export function renderer() {
	let blocks = new Map<string, string>();
	let seen = version;
	return (text: string) => {
		if (seen !== version) {
			blocks = new Map();
			seen = version;
		}
		const tokens = marked.lexer(text);
		const next = new Map<string, string>();
		let html = '';
		for (const token of tokens) {
			const block =
				blocks.get(token.raw) ??
				marked.parser(Object.assign([token] as Token[], { links: tokens.links }) as TokensList);
			next.set(token.raw, block);
			html += block;
		}
		blocks = next;
		return html;
	};
}
