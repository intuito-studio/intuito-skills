#!/usr/bin/env node
// Waits until the live site serves the commit that is on origin/main, by reading /health.
// Usage: node scripts/check-deploy.mjs [site-url] [--timeout=600]
//   exit 0 = live site is on that commit, 1 = not updated in time, 2 = could not check
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const site = (args.find((a) => !a.startsWith('--')) ?? process.env.SITE_URL ?? 'https://skills.intuito.dev').replace(/\/$/, '');
const timeout = Number((args.find((a) => a.startsWith('--timeout=')) ?? '--timeout=600').split('=')[1]) * 1000;

let want;
try {
  want = execSync('git rev-parse origin/main', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  console.error('Could not read origin/main. Run this inside the repo after a push.');
  process.exit(2);
}

const start = Date.now();
let last = 'no answer yet';
console.log(`Waiting for ${site}/health to report ${want.slice(0, 7)} ...`);
for (;;) {
  try {
    const res = await fetch(`${site}/health?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const h = await res.json();
      if (h.commit === want) {
        console.log(`✓ Live: ${want.slice(0, 7)}, built ${h.builtAt}`);
        process.exit(0);
      }
      last = `live commit is ${String(h.commit).slice(0, 7)}, built ${h.builtAt}`;
    } else last = `HTTP ${res.status}`;
  } catch (e) {
    last = e.cause?.code ?? e.message;
  }
  if (Date.now() - start > timeout) {
    console.error(`✗ Not updated after ${Math.round(timeout / 1000)}s: ${last}. Check the deploy log in Netlify.`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 10000));
}
