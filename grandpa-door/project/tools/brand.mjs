// node tools/brand.mjs out_dir : renders brand.html?a=… for each asset to PNG with Playwright
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.resolve(process.argv[2] || 'brand');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, b = await chromium.launch(), pg = await b.newPage();
for (const a of ['avatar', 'banner', 'watermark']) {
  await pg.goto(`http://127.0.0.1:${port}/brand.html?a=${a}`);
  await pg.waitForFunction(() => window.DONE || window.ERR, null, { timeout: 60000 });
  const err = await pg.evaluate(() => window.ERR); if (err) { console.error(a, err); continue; }
  const d = await pg.evaluate(() => window.DONE); fs.writeFileSync(path.join(OUT, `${a}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log(a, 'ok');
}
await b.close(); srv.close();
