// Grava demo/video.html quadro a quadro e gera dist/divulgacao.mp4 (1080x1920, 30 fps).
// Uso: node demo/video.mjs            (vídeo inteiro)
//      node demo/video.mjs 3 12 20     (só tira prints desses segundos, em dist/quadro-N.png)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const FPS = 30;
mkdirSync('dist', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + resolve('demo/video.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');

const prints = process.argv.slice(2).map(Number);
if (prints.length) {
  for (const t of prints) {
    await page.evaluate(t => seek(t), t);
    await page.screenshot({ path: `dist/quadro-${t}.png` });
  }
} else {
  const total = Math.round((await page.evaluate(() => DURACAO)) * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart',
    'dist/divulgacao.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`${(f / FPS).toFixed(0)}s / ${total / FPS}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('dist/divulgacao.mp4');
}
await browser.close();
