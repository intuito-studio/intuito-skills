#!/usr/bin/env node
// Checks every skill against the Agent Skills spec and this repo's house rules (see AGENTS.md).
// Usage: node scripts/validate.mjs            exit 0 = all pass, 1 = at least one error
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { ROOT, SKILLS_DIR, SPEC_KEYS, NAME_RE, LIST_START, LIST_END, DOMAINS, skillDirs, parseSkill, readmeListBlock } from './lib.mjs';

const problems = [];
const err = (where, msg) => problems.push(`${where}: ${msg}`);

const names = skillDirs();
if (names.length === 0) err('skills/', 'no skills found.');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

for (const name of names) {
  const where = `skills/${name}`;
  const dir = join(SKILLS_DIR, name);
  const file = join(dir, 'SKILL.md');
  if (!NAME_RE.test(name) || name.length > 64) err(where, 'folder name must be 1-64 characters of a-z, 0-9 and single hyphens, with no hyphen at either end.');
  if (!existsSync(file)) { err(where, 'has no SKILL.md (the file name is case-sensitive).'); continue; }

  const text = readFileSync(file, 'utf8');
  const { errors, data, body } = parseSkill(text);
  errors.forEach((e) => err(where, e));

  for (const key of Object.keys(data)) {
    if (!SPEC_KEYS.includes(key)) err(where, `frontmatter key "${key}" is not in the Agent Skills spec. Allowed: ${SPEC_KEYS.join(', ')}. Put extras under metadata.`);
  }
  if (typeof data.name !== 'string' || !data.name) err(where, 'frontmatter needs a "name".');
  else if (data.name !== name) err(where, `name "${data.name}" must equal the folder name "${name}".`);

  const d = data.description;
  if (typeof d !== 'string' || !d) err(where, 'frontmatter needs a "description".');
  else {
    if (d.length > 1024) err(where, `description is ${d.length} characters; the limit is 1024.`);
    if (d.length < 80) err(where, `description is ${d.length} characters; too short to say what the skill does and when to use it.`);
    if (!/\buse (it |this |this skill )?when(ever)?\b/i.test(d)) err(where, 'description must say when to use the skill, in a sentence that starts "Use when ...".');
    if (/\b(I can|I will|I help|helps you|this skill helps)\b/i.test(d)) err(where, 'description should state what the skill does, starting with a verb, without "I can" or "helps you".');
  }
  if (data.compatibility !== undefined && (typeof data.compatibility !== 'string' || data.compatibility.length > 500)) err(where, 'compatibility must be a string of at most 500 characters.');
  for (const key of ['license', 'allowed-tools']) {
    if (data[key] !== undefined && typeof data[key] !== 'string') err(where, `${key} must be a string.`);
  }
  if (data.metadata !== undefined) {
    if (typeof data.metadata !== 'object') err(where, 'metadata must be a map of string keys to string values.');
    else for (const [k, v] of Object.entries(data.metadata)) {
      if (/^(true|false|null|~|-?\d+(\.\d+)?)$/i.test(v.raw)) err(where, `metadata.${k} must be a string. Write it in quotes: "${v.raw}".`);
    }
  }

  const domain = typeof data.metadata === 'object' ? data.metadata?.domain?.value : undefined;
  if (!domain) err(where, `frontmatter needs metadata.domain, one of: ${DOMAINS.map((x) => x.id).join(', ')} (see domains.json).`);
  else if (!DOMAINS.some((x) => x.id === domain)) err(where, `metadata.domain "${domain}" is not in domains.json. Use one of: ${DOMAINS.map((x) => x.id).join(', ')}, or add the domain there first.`);

  // The website's demo and before/after for this skill.
  const showcase = join(ROOT, 'site', 'content', `${name}.json`);
  if (!existsSync(showcase)) err(where, `has no site/content/${name}.json (the demo and before/after shown on the website). See AGENTS.md.`);
  else {
    try {
      const sc = JSON.parse(readFileSync(showcase, 'utf8'));
      if (!sc.demo?.prompt || !sc.demo?.result) err(where, `site/content/${name}.json needs demo.prompt and demo.result.`);
      for (const k of ['before', 'after']) if (!sc[k]?.label || !sc[k]?.text) err(where, `site/content/${name}.json needs ${k}.label and ${k}.text.`);
      if (!sc.method) err(where, `site/content/${name}.json needs "method": one sentence on how the before and after were produced.`);
    } catch (e) { err(where, `site/content/${name}.json is not valid JSON: ${e.message}`); }
  }

  // The skill's share card for the website.
  if (!existsSync(join(ROOT, 'site', 'public', 'og', `${name}.png`))) err(where, `has no share card at site/public/og/${name}.png. Run: node scripts/og-cards.mjs`);

  const bodyLines = body.split('\n').length;
  if (!body.trim()) err(where, 'SKILL.md has no body.');
  if (bodyLines > 500) err(where, `SKILL.md body is ${bodyLines} lines; the limit is 500. Move reference material to a sibling file.`);
  if (!/^# \S/m.test(body)) err(where, 'SKILL.md body needs a "# Title" heading.');

  for (const f of walk(dir)) {
    const rel = relative(dir, f);
    if (rel.split(sep).some((p) => p === '.DS_Store' || p === 'node_modules')) { err(where, `remove ${rel}.`); continue; }
    if (!/\.(md|txt|json|ya?ml|m?js|ts|py|sh|html|css)$/.test(f)) continue;
    const t = readFileSync(f, 'utf8');
    if (f.endsWith('.md') && /\bREPLACE\b/.test(t)) err(where, `${rel} still contains template placeholder text (REPLACE).`);
    if (/\/Users\/[A-Za-z0-9._-]+\/|\/home\/[A-Za-z0-9._-]+\/|[A-Z]:\\Users\\/.test(t)) err(where, `${rel} contains an absolute path from someone's machine.`);
    if (!f.endsWith('.md')) continue;
    const withoutCode = t.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const m of withoutCode.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = m[1];
      if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
      const p = resolve(join(f, '..'), decodeURIComponent(target.split('#')[0]));
      if (!p.startsWith(dir + sep)) err(where, `${rel} links outside the skill folder: ${target}. A skill is installed on its own, so it can only link to its own files.`);
      else if (!existsSync(p)) err(where, `${rel} links to a file that does not exist: ${target}`);
    }
  }
}

// README list must match skills/.
const readmePath = join(ROOT, 'README.md');
if (!existsSync(readmePath)) err('README.md', 'is missing.');
else {
  const readme = readFileSync(readmePath, 'utf8');
  const a = readme.indexOf(LIST_START), b = readme.indexOf(LIST_END);
  if (a === -1 || b === -1) err('README.md', `needs the markers ${LIST_START} and ${LIST_END} around the skill list.`);
  else if (readme.slice(a, b + LIST_END.length) !== readmeListBlock()) err('README.md', 'skill list is out of date. Run: node scripts/sync-readme.mjs');
}

// Claude Code marketplace manifest must parse and point at real skills.
const mp = join(ROOT, '.claude-plugin', 'marketplace.json');
if (existsSync(mp)) {
  try {
    const j = JSON.parse(readFileSync(mp, 'utf8'));
    if (!j.name || !j.owner?.name || !Array.isArray(j.plugins)) err('.claude-plugin/marketplace.json', 'needs name, owner.name and plugins.');
    for (const p of j.plugins ?? []) {
      if (!p.name || !p.source) err('.claude-plugin/marketplace.json', 'every plugin needs a name and a source.');
      for (const s of p.skills ?? []) {
        if (!existsSync(join(ROOT, s, 'SKILL.md'))) err('.claude-plugin/marketplace.json', `plugin "${p.name}" lists ${s}, which has no SKILL.md.`);
      }
    }
  } catch (e) { err('.claude-plugin/marketplace.json', `is not valid JSON: ${e.message}`); }
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} in ${names.length} skill${names.length === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`✓ ${names.length} skill${names.length === 1 ? '' : 's'} valid: ${names.join(', ')}`);
