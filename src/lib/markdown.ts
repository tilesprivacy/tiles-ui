import { Marked, type Token, type TokensList } from 'marked';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

for (const [name, language] of Object.entries({
	bash,
	c,
	cpp,
	css,
	diff,
	go,
	java,
	javascript,
	json,
	python,
	rust,
	sql,
	typescript,
	xml,
	yaml
})) {
	hljs.registerLanguage(name, language);
}

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
		// the page can't load outside images, so they become links
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

// one cache per message, so a streaming reply only renders its last block again
export function renderer() {
	let blocks = new Map<string, string>();
	return (text: string) => {
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
