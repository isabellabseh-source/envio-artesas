// Builds dist/previa.html: the artisan form as one self-contained page, for showing without a server.
import { build } from 'esbuild';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const r = await build({
  entryPoints: ['demo/previa.tsx'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  target: 'es2020',
  alias: { '@': '.' },
  define: { 'process.env.NODE_ENV': '"production"' },
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('app/globals.css', 'utf8') + readFileSync('demo/previa.css', 'utf8');
const html = `<title>Prévia do envio de conteúdo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="app"></div>
<script>${js}</script>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/previa.html', html);
console.log(`dist/previa.html ${(html.length / 1024).toFixed(0)} KB`);
