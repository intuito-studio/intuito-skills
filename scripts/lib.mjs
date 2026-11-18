// Shared helpers for the repo scripts. No dependencies.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SKILLS_DIR = join(ROOT, 'skills');
export const SPEC_KEYS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const LIST_START = '<!-- skills:start -->';
export const LIST_END = '<!-- skills:end -->';

export function skillDirs() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((n) => !n.startsWith('.') && statSync(join(SKILLS_DIR, n)).isDirectory())
    .sort();
}

function scalar(raw, errors, key) {
  const v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"') && v.length > 1) || (v.startsWith("'") && v.endsWith("'") && v.length > 1)) {
    return v.startsWith('"') ? v.slice(1, -1).replace(/\\"/g, '"') : v.slice(1, -1).replace(/''/g, "'");
  }
  if (/: /.test(v) || / #/.test(v) || /:$/.test(v)) {
    errors.push(`frontmatter "${key}": an unquoted value contains ": " or " #", which is not valid YAML. Wrap the value in double quotes.`);
  }
  if (/^[\[{&*!|>%@`]/.test(v)) {
    errors.push(`frontmatter "${key}": value starts with a YAML special character. Wrap it in double quotes.`);
  }
  return v;
}

// Parses the small YAML subset skills use: top-level "key: value", block scalars (> and |),
// and one nested map (metadata). Anything else is reported as an error.
export function parseSkill(text) {
  const errors = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return { errors: ['SKILL.md must start with a "---" frontmatter line.'], data: {}, body: text };
  const end = lines.indexOf('---', 1);
  if (end === -1) return { errors: ['Frontmatter is not closed with a "---" line.'], data: {}, body: '' };
  const fm = lines.slice(1, end);
  const body = lines.slice(end + 1).join('\n');
  const data = {};
  for (let i = 0; i < fm.length; i++) {
    const line = fm[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (!m) { errors.push(`frontmatter line ${i + 2} is not "key: value": ${line}`); continue; }
    const [, key, rest] = m;
    if (key in data) errors.push(`frontmatter key "${key}" appears twice.`);
    const nested = [];
    while (i + 1 < fm.length && (/^\s+\S/.test(fm[i + 1]) || (!fm[i + 1].trim() && nested.length))) nested.push(fm[++i]);
    const r = rest.trim();
    if (/^[>|][+-]?$/.test(r)) {
      const parts = nested.map((l) => l.trim());
      data[key] = r.startsWith('>') ? parts.join(' ').replace(/\s+/g, ' ').trim() : parts.join('\n').trim();
    } else if (r === '') {
      const map = {};
      for (const n of nested) {
        if (!n.trim()) continue;
        const nm = /^\s+([A-Za-z0-9_.-]+):(.*)$/.exec(n);
        if (!nm) { errors.push(`frontmatter "${key}": cannot read nested line: ${n.trim()}`); continue; }
        map[nm[1]] = { raw: nm[2].trim(), value: scalar(nm[2], errors, `${key}.${nm[1]}`) };
      }
      data[key] = map;
    } else {
      if (nested.length) errors.push(`frontmatter "${key}": value continues on indented lines. Keep it on one line, or use a ">" block.`);
      data[key] = scalar(r, errors, key);
    }
  }
  return { errors, data, body };
}

export function readSkill(name) {
  const file = join(SKILLS_DIR, name, 'SKILL.md');
  if (!existsSync(file)) return null;
  return parseSkill(readFileSync(file, 'utf8'));
}

// First sentence of a description, used for the README list.
export function summary(description) {
  const m = /^(.+?[.!?])(\s|$)/.exec(description);
  return (m ? m[1] : description).trim();
}

export function readmeListBlock() {
  const rows = skillDirs().map((name) => {
    const s = readSkill(name);
    const d = s && typeof s.data.description === 'string' ? summary(s.data.description) : '';
    return `- **[${name}](skills/${name}/SKILL.md)**: ${d}`;
  });
  return [LIST_START, ...rows, LIST_END].join('\n');
}
