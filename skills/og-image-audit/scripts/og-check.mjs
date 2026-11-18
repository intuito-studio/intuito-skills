#!/usr/bin/env node
// Checks share images (og:image / twitter:image): size, aspect, file size, format and meta tags.
// No dependencies. Node.js 18 or later.
//
//   node og-check.mjs <file | folder | page URL> [more...]
//   node og-check.mjs --sitemap https://example.com/sitemap.xml [--max=50]
//   options: --report=PATH (default: og-check-report.html in the system temp folder)  --no-report
//            --save=DIR (keep a copy of each image fetched from a page)  --json
//
// Exit: 0 no failures, 1 failures, 2 could not run.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const W = 1200, H = 630, MAX_BYTES = 300 * 1024;
const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith('--' + name + '='))?.split('=').slice(1).join('=');
const flag = (name) => args.includes('--' + name);
const targets = args.filter((a) => !a.startsWith('--'));
const sitemapAt = args.indexOf('--sitemap');
const sitemap = sitemapAt >= 0 ? args[sitemapAt + 1] : null;
if (sitemap) targets.splice(targets.indexOf(sitemap), 1);
const max = Number(opt('max') ?? 50);
const reportPath = flag('no-report') ? null : resolve(opt('report') ?? join(tmpdir(), 'og-check-report.html'));
const saveDir = opt('save') ? resolve(opt('save')) : null;
if (saveDir) mkdirSync(saveDir, { recursive: true });

if (!targets.length && !sitemap) {
  console.error('Usage: node og-check.mjs <file | folder | page URL> [more...]\n       node og-check.mjs --sitemap <sitemap URL> [--max=50]');
  process.exit(2);
}

// ---- image header parsing -------------------------------------------------
function imageInfo(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) return { format: 'PNG', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'GIF') return { format: 'GIF', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  if (buf.length >= 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const kind = buf.toString('latin1', 12, 16);
    if (kind === 'VP8X') return { format: 'WebP', width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { format: 'WebP', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { format: 'WebP', width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
    return { format: 'WebP' };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m === 0xff) { i++; continue; }
      if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { format: 'JPEG', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { format: 'JPEG' };
  }
  const head = buf.toString('utf8', 0, 300).trimStart();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return { format: 'SVG' };
  if (buf.length >= 12 && buf.toString('latin1', 4, 8) === 'ftyp') return { format: /avif|avis/.test(buf.toString('latin1', 8, 12)) ? 'AVIF' : 'HEIF/other' };
  return { format: 'unknown' };
}

function checkImage(buf, lines, sizeLevel = 'FAIL') {
  const info = imageInfo(buf);
  const kb = Math.round(buf.length / 1024);
  const add = (level, text) => lines.push({ level, text });
  if (!info.width) add('FAIL', `size: could not read the pixel size (${info.format})`);
  else if (info.width === W && info.height === H) add('PASS', `size: ${W}×${H}`);
  else {
    const ratio = info.width / info.height;
    const off = Math.abs(ratio - W / H) / (W / H);
    if (off <= 0.01 && info.width >= W) add('REVIEW', `size: ${info.width}×${info.height}, right shape but not ${W}×${H}`);
    else if (off <= 0.01) add('FAIL', `size: ${info.width}×${info.height}, right shape but smaller than ${W}×${H}`);
    else add('FAIL', `size: ${info.width}×${info.height} is ${ratio.toFixed(2)}:1, needs ${W}×${H} (1.91:1)`);
  }
  if (buf.length <= MAX_BYTES) add('PASS', `file size: ${kb} KB`);
  else if (sizeLevel === 'FAIL') add('FAIL', `file size: ${kb} KB, limit 300 KB (WhatsApp skips larger images)`);
  else add('WARN', `file size: ${kb} KB, over 300 KB. The limit is known for og:image (WhatsApp); it is not confirmed for this tag`);
  if (info.format === 'PNG' || info.format === 'JPEG') add('PASS', `format: ${info.format}`);
  else add('REVIEW', `format: ${info.format}; only PNG and JPEG were tested across platforms`);
  return info;
}

// ---- pages ------------------------------------------------------------------
const UA = 'Mozilla/5.0 (compatible; og-check/1.0)';
async function get(url, asText) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: asText ? 'text/html,*/*' : 'image/*,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  return { res, body: asText ? await res.text() : Buffer.from(await res.arrayBuffer()) };
}
function metaTags(html) {
  const head = html.split(/<\/head>/i)[0];
  const out = {};
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (n) => new RegExp('\\b' + n + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(tag);
    const key = attr('property') ?? attr('name');
    const val = attr('content');
    if (!key || !val) continue;
    const k = (key[2] ?? key[3] ?? key[4]).toLowerCase();
    const v = (val[2] ?? val[3] ?? val[4]).replace(/&amp;/g, '&');
    if (!(k in out)) out[k] = v;
  }
  return out;
}

async function checkPage(url) {
  const lines = [];
  const add = (level, text) => lines.push({ level, text });
  const item = { target: url, kind: 'page', lines, images: [] };
  let html;
  try {
    const { res, body } = await get(url, true);
    if (!res.ok) { add('FAIL', `page: HTTP ${res.status}`); return item; }
    html = body;
  } catch (e) { add('FAIL', `page: no answer (${e.cause?.code ?? e.message})`); return item; }
  const m = metaTags(html);
  const og = m['og:image'] ?? m['og:image:url'] ?? m['og:image:secure_url'];
  const tw = m['twitter:image'] ?? m['twitter:image:src'];
  if (!og) add('FAIL', 'og:image: missing from the HTML the server sends');
  if (m['twitter:card'] === 'summary_large_image') add('PASS', 'twitter:card: summary_large_image');
  else add('FAIL', `twitter:card: ${m['twitter:card'] ? '"' + m['twitter:card'] + '"' : 'missing'}, needs summary_large_image`);
  if (!tw && og) add('PASS', 'twitter:image: not set, X falls back to og:image');
  if (!tw && !og) add('FAIL', 'twitter:image: missing');

  const seen = new Set();
  for (const [name, raw] of [['og:image', og], ['twitter:image', tw]]) {
    if (!raw) continue;
    let abs;
    if (/^https?:\/\//i.test(raw)) abs = raw;
    else { abs = new URL(raw, url).href; add('FAIL', `${name}: "${raw}" is not an absolute URL`); }
    if (seen.has(abs)) { add('PASS', `${name}: same image as og:image`); continue; }
    if (name === 'twitter:image') add('REVIEW', 'twitter:image differs from og:image; both are checked below');
    seen.add(abs);
    try {
      const { res, body } = await get(abs, false);
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok) { add('FAIL', `${name}: HTTP ${res.status} for ${abs}`); continue; }
      if (!type.startsWith('image/')) add('FAIL', `${name}: content type is "${type}", not an image`);
      else add('PASS', `${name}: 200, ${type}`);
      const sub = [];
      const info = checkImage(body, sub, name === 'og:image' ? 'FAIL' : 'WARN');
      sub.forEach((l) => lines.push({ level: l.level, text: `${name} ${l.text}` }));
      if (name === 'og:image') {
        const dw = m['og:image:width'], dh = m['og:image:height'];
        if (!dw || !dh) add('WARN', 'og:image:width / og:image:height: missing (recommended practice; no failure was observed without them)');
        else if (info.width && (Number(dw) !== info.width || Number(dh) !== info.height)) add('FAIL', `og:image:width/height say ${dw}×${dh}, the file is ${info.width}×${info.height}`);
        else add('PASS', `og:image:width/height: ${dw}×${dh}`);
      }
      let saved = null;
      if (saveDir) {
        const ext = { PNG: '.png', JPEG: '.jpg', WebP: '.webp', GIF: '.gif' }[info.format] ?? '';
        const slug = (new URL(url).hostname + new URL(url).pathname).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
        saved = join(saveDir, `${slug}.${name.replace(':', '-')}${ext}`);
        writeFileSync(saved, body);
        add('PASS', `${name}: saved to ${saved}`);
      }
      item.images.push({ src: abs, label: `${name} of ${url}` });
    } catch (e) { add('FAIL', `${name}: no answer for ${abs} (${e.cause?.code ?? e.message})`); }
  }
  return item;
}

function checkFile(path) {
  const lines = [];
  const buf = readFileSync(path);
  checkImage(buf, lines);
  return { target: path, kind: 'file', lines, images: [{ src: pathToFileURL(resolve(path)).href, label: path }] };
}

// ---- report -------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function report(items) {
  const rows = items.flatMap((it) => it.images.map((im) => `
<section>
  <h2>${esc(im.label)}</h2>
  <ul>${it.lines.map((l) => `<li class="${l.level}"><b>${l.level}</b> ${esc(l.text)}</li>`).join('')}</ul>
  <div class="views">
    <figure><div class="card"><img src="${esc(im.src)}" alt=""><i class="strip t"></i><i class="strip b"></i><i class="margin"></i><i class="must"></i><i class="sq"></i></div><figcaption>Full card with zones: dashed = square crop, solid = must-read area, dotted = 60 px margin, shaded = strips X trims</figcaption></figure>
    <figure><div class="crop"><img src="${esc(im.src)}" alt=""></div><figcaption>Square crop (comments, Messenger, iMessage)</figcaption></figure>
    <figure><img class="small" src="${esc(im.src)}" alt=""><figcaption>At 400 px wide</figcaption></figure>
  </div>
</section>`)).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Share image check</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;margin:24px;background:#777;color:#fff}
section{margin:0 0 48px}h1{font-size:20px}h2{font-size:15px;margin:0 0 6px;word-break:break-all}
ul{margin:0 0 12px;padding:0;list-style:none;columns:2;max-width:1200px}li{margin:0 0 2px}li b{display:inline-block;width:62px;font-size:11px}
.FAIL b{color:#ffb4a8}.PASS b{color:#c8f0c0}.REVIEW b,.WARN b{color:#ffe08a}
.views{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}figure{margin:0}figcaption{font-size:12px;margin-top:4px;max-width:600px}
.card{position:relative;width:1200px;height:630px;overflow:hidden;background:#000}.card img{width:1200px;height:630px;object-fit:cover;display:block}
.card i{position:absolute;box-sizing:border-box;pointer-events:none}
.sq{left:285px;top:0;width:630px;height:630px;border:3px dashed #ff2d95}
.must{left:315px;top:24px;width:570px;height:566px;border:2px solid #00e0ff}
.margin{left:60px;top:60px;width:1080px;height:510px;border:2px dotted #fff}
.strip{left:0;width:1200px;background:rgba(255,45,149,.28)}.strip.t{top:0;height:24px}.strip.b{top:590px;height:40px}
.crop{width:630px;height:630px;overflow:hidden;position:relative;background:#000}.crop img{position:absolute;left:-285px;top:0;width:1200px;height:630px;object-fit:cover}
.small{width:400px;display:block}
</style>
<h1>Share image check: ${items.length} target${items.length === 1 ? '' : 's'}</h1>${rows || '<p>No images to show.</p>'}</html>`;
}

// ---- main -----------------------------------------------------------------------
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? (n === 'node_modules' || n.startsWith('.') ? [] : walk(p)) : [p]; });

const items = [];
const notes = [];
try {
  const pages = [];
  if (sitemap) {
    const { res, body } = await get(sitemap, true);
    if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
    const locs = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (locs.length > max) notes.push(`sitemap lists ${locs.length} URLs; checked the first ${max} (raise with --max=N)`);
    pages.push(...locs.slice(0, max));
  }
  for (const t of targets) {
    if (/^https?:\/\//i.test(t)) pages.push(t);
    else if (!existsSync(t)) throw new Error(`not found: ${t}`);
    else if (statSync(t).isDirectory()) {
      const files = walk(t).filter((f) => IMG_EXT.has(extname(f).toLowerCase())).sort();
      if (!files.length) notes.push(`no image files in ${t}`);
      files.forEach((f) => items.push(checkFile(f)));
    } else items.push(checkFile(t));
  }
  for (const p of pages) items.push(await checkPage(p));
} catch (e) {
  console.error('og-check could not run: ' + e.message);
  process.exit(2);
}

const count = (level) => items.reduce((n, it) => n + it.lines.filter((l) => l.level === level).length, 0);
if (flag('json')) console.log(JSON.stringify({ items, notes }, null, 2));
else {
  for (const it of items) {
    console.log('\n' + it.target);
    for (const l of it.lines) console.log(`  ${l.level.padEnd(6)} ${l.text}`);
  }
  console.log(`\n${items.length} target${items.length === 1 ? '' : 's'}: ${count('FAIL')} failures, ${count('WARN')} warnings, ${count('REVIEW')} to review, ${count('PASS')} passes.`);
  notes.forEach((n) => console.log('NOTE ' + n));
  console.log('The script cannot see inside a picture. Look at the square crop of each image next.');
}
if (reportPath) { writeFileSync(reportPath, report(items)); if (!flag('json')) console.log('Report with zones and square crops: ' + reportPath); }
process.exit(count('FAIL') ? 1 : 0);
