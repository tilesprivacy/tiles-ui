// the daemon's CSP only runs scripts from files, so the inline boot script moves into one
import { readFileSync, writeFileSync } from 'node:fs';

const page = 'build/index.html';
const html = readFileSync(page, 'utf8');
const inline = /<script>([\s\S]*?)<\/script>/;
const boot = html.match(inline);
if (!boot) throw new Error(`no inline script in ${page}`);

writeFileSync('build/_app/boot.js', boot[1].trim() + '\n');
writeFileSync(page, html.replace(inline, '<script src="/_app/boot.js"></script>'));
