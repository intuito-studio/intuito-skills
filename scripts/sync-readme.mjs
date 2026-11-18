#!/usr/bin/env node
// Rewrites the skill list in README.md from the skills/ folder.
// Usage: node scripts/sync-readme.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, LIST_START, LIST_END, readmeListBlock } from './lib.mjs';

const path = join(ROOT, 'README.md');
const readme = readFileSync(path, 'utf8');
const a = readme.indexOf(LIST_START), b = readme.indexOf(LIST_END);
if (a === -1 || b === -1) {
  console.error(`README.md needs the markers ${LIST_START} and ${LIST_END}.`);
  process.exit(1);
}
const next = readme.slice(0, a) + readmeListBlock() + readme.slice(b + LIST_END.length);
if (next !== readme) writeFileSync(path, next);
console.log(next === readme ? 'README.md skill list already up to date.' : 'README.md skill list updated.');
