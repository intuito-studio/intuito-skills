#!/usr/bin/env node
// Creates skills/<name>/SKILL.md from the template.
// Usage: node scripts/new-skill.mjs <name>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SKILLS_DIR, NAME_RE } from './lib.mjs';

const name = process.argv[2];
if (!name || !NAME_RE.test(name) || name.length > 64) {
  console.error('Usage: node scripts/new-skill.mjs <name>\nThe name is 1-64 characters of a-z, 0-9 and single hyphens, for example "review-contract".');
  process.exit(1);
}
const dir = join(SKILLS_DIR, name);
if (existsSync(dir)) { console.error(`skills/${name} already exists.`); process.exit(1); }
const template = readFileSync(join(ROOT, 'templates', 'SKILL.template.md'), 'utf8');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'SKILL.md'), template.replace('REPLACE-with-folder-name', name));
console.log(`Created skills/${name}/SKILL.md\nNext: replace every REPLACE in it, add site/content/${name}.json (see AGENTS.md), then run: node scripts/sync-readme.mjs && node scripts/validate.mjs`);
