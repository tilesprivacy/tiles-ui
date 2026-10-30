import { expect, test } from 'vitest';
import { hasMath, loadMath, renderer } from './markdown.ts';

test('raw HTML shows as text', () => {
	const html = renderer()('<img src=x onerror=alert(1)> <script>alert(1)</script>');
	expect(html).not.toMatch(/<img|<script/);
	expect(html).toContain('&#60;script&#62;');
});

test('only safe links become links', () => {
	const render = renderer();
	expect(render('[ok](https://tiles.run)')).toContain('href="https://tiles.run"');
	expect(render('[no](javascript:alert(1))')).not.toContain('href');
	expect(render('![pic](https://x.test/a.png)')).not.toContain('<img');
});

test('code blocks get a header with copy', () => {
	expect(renderer()('```rust\nfn main() {}\n```')).toMatch(/code-head.*rust.*data-copy/s);
});

test('a block renders again once maths loads', async () => {
	const render = renderer();
	const text = 'Euler: $e^{i\\pi} + 1 = 0$, for $5 and $10 it stays text';
	expect(hasMath(text)).toBe(true);
	expect(render(text)).not.toContain('katex');
	await loadMath();
	const html = render(text);
	expect(html).toContain('class="katex"');
	expect(html).toContain('$5 and $10');
	expect(renderer()('$$\n\\frac{1}{2}\n$$')).toContain('katex-display');
});
