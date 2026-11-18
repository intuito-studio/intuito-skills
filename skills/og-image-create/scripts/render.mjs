#!/usr/bin/env node
// Renders a share-card HTML file to a 1200x630 PNG, after running the zone check the template defines.
// Uses Playwright or Puppeteer from the project it is run in. Installs nothing.
//
//   node render.mjs <card.html> <out.png | out.jpg> [--scheme=dark|light]
//   OG_BROWSER_PATH=/path/to/chrome  use this browser binary
//
// Also writes two files to look at and then delete: <out>.square.png, the middle 630x630 that comment
// threads and message apps show, and <out>.small.png, the card at 400 px wide.
// Exit: 0 passed, 1 a check failed, 2 could not run.
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [htmlArg, outArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const scheme = process.argv.find((a) => a.startsWith('--scheme='))?.split('=')[1];
if (!htmlArg || !outArg) { console.error('Usage: node render.mjs <card.html> <out.png | out.jpg> [--scheme=dark|light]'); process.exit(2); }
const html = resolve(htmlArg), out = resolve(outArg);
if (!existsSync(html)) { console.error('Not found: ' + html); process.exit(2); }

const require = createRequire(join(process.cwd(), 'package.json'));
let lib = null, name = null;
for (const n of ['playwright', 'playwright-core', '@playwright/test', 'puppeteer', 'puppeteer-core']) {
  try { lib = require(n); name = n; break; } catch {}
}
if (!lib) {
  console.error('RENDER NOT RUN: no Playwright or Puppeteer in this project. Run this from a project that has one, or open the HTML at 1200x630 in a browser tool, run "await window.ogCheck()" and screenshot the viewport.');
  process.exit(2);
}

const MAX_BYTES = 300 * 1024;
const exe = process.env.OG_BROWSER_PATH;
const isPuppeteer = name.startsWith('puppeteer');
let browser;
try {
  if (isPuppeteer) {
    browser = await lib.launch({ headless: true, ...(exe ? { executablePath: exe } : {}), args: ['--allow-file-access-from-files'] });
  } else {
    const chromium = lib.chromium;
    const base = { args: ['--allow-file-access-from-files'] };
    try { browser = await chromium.launch(exe ? { ...base, executablePath: exe } : base); }
    catch (e) { if (exe) throw e; browser = await chromium.launch({ ...base, channel: 'chrome' }); }
  }
} catch (e) {
  console.error('RENDER NOT RUN: could not start a browser (' + String(e.message).split('\n')[0] + '). Set OG_BROWSER_PATH to a Chrome or Chromium binary.');
  process.exit(2);
}

const fails = [];
try {
  let page;
  if (isPuppeteer) {
    page = await browser.newPage(); await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    if (scheme) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  } else page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, ...(scheme ? { colorScheme: scheme } : {}) });
  await page.goto(pathToFileURL(html).href);
  const hasCheck = await page.evaluate(() => typeof window.ogCheck === 'function');
  if (!hasCheck) fails.push('the page does not define window.ogCheck(); build it from the card template');
  else {
    fails.push(...(await page.evaluate(() => window.ogCheck())));
    for (const n of await page.evaluate(() => window.ogNotes ?? [])) console.log('NOTE ' + n);
  }
  const jpeg = /\.jpe?g$/i.test(out);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 }, ...(jpeg ? { type: 'jpeg', quality: 88 } : {}) });
  const stem = out.replace(/\.(png|jpe?g)$/i, '');
  const square = stem + '.square.png';
  await page.screenshot({ path: square, clip: { x: 285, y: 0, width: 630, height: 630 } });
  const size = await page.evaluate(() => document.querySelector('.headline')?.dataset.finalSize ?? null);
  if (size) console.log('Headline size: ' + size + 'px');
  const small = stem + '.small.png';
  await page.setContent('<body style="margin:0;background:#888"><img src="' + pathToFileURL(out).href + '" style="display:block;width:400px">');
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => null))));
  await page.screenshot({ path: small, clip: { x: 0, y: 0, width: 400, height: 210 } });
  const bytes = statSync(out).size;
  console.log('Wrote ' + out + ' (' + Math.round(bytes / 1024) + ' KB)');
  console.log('Wrote ' + square + ' (the square crop: look at it)');
  console.log('Wrote ' + small + ' (the card at 400 px wide: look at it)');
  if (bytes > MAX_BYTES) fails.push('file is ' + Math.round(bytes / 1024) + ' KB, over 300 KB; save it as a 256-colour palette PNG, or render to a .jpg path');
} finally {
  await browser.close();
}

if (fails.length) { console.error('\nShare-card check failed:\n' + fails.map((f) => '  - ' + f).join('\n')); process.exit(1); }
console.log('Share-card check passed.');
