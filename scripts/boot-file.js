// the daemon's CSP blocks inline scripts, move SvelteKit's boot script into a file
import { readFileSync, writeFileSync } from 'node:fs';

const page = 'build/index.html';
const html = readFileSync(page, 'utf8');
const inline = /<script>([\s\S]*?)<\/script>/;
const boot = html.match(inline);
if (!boot) throw new Error(`no inline script in ${page}`);

writeFileSync('build/_app/boot.js', boot[1].trim() + '\n');
writeFileSync(page, html.replace(inline, '<script src="/_app/boot.js"></script>'));
