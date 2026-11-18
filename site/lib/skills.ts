import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { marked } from 'marked';

// The build runs from site/, so the repo root is one folder up.
const ROOT = join(process.cwd(), '..');
const SKILLS_DIR = join(ROOT, 'skills');
const CONTENT_DIR = join(process.cwd(), 'content');

export const REPO = 'intuito-studio/intuito-skills';
export const PLUGIN = 'intuito-skills@intuito';

export type Domain = { id: string; label: string; blurb: string };
export type Sample = { label: string; text: string; note?: string };
export type Showcase = {
  demo?: { prompt: string; result: string; caption?: string };
  before?: Sample;
  after?: Sample;
  method?: string;
};
export type Heading = { id: string; text: string };
export type Skill = {
  name: string;
  title: string;
  description: string;
  what: string;
  summary: string;
  when: string[];
  license: string;
  domain: Domain;
  lines: number;
  files: string[];
  bodyHtml: string;
  headings: Heading[];
  showcase: Showcase | null;
};

export const domains: Domain[] = JSON.parse(readFileSync(join(ROOT, 'domains.json'), 'utf8'));

const unquote = (v: string) => {
  const s = v.trim();
  if (s.length > 1 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1).replace(/\\"/g, '"');
  if (s.length > 1 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  return s;
};

// scripts/validate.mjs guarantees this shape: one-line "key: value" pairs and one nested metadata map.
function parse(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const end = lines.indexOf('---', 1);
  const data: Record<string, string> = {};
  const metadata: Record<string, string> = {};
  let inMeta = false;
  for (const line of lines.slice(1, end)) {
    const nested = /^\s+([A-Za-z0-9_.-]+):(.*)$/.exec(line);
    if (inMeta && nested) { metadata[nested[1]] = unquote(nested[2]); continue; }
    const top = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (!top) continue;
    inMeta = top[1] === 'metadata';
    if (!inMeta) data[top[1]] = unquote(top[2]);
  }
  return { data, metadata, body: lines.slice(end + 1).join('\n').trim() };
}

const slug = (t: string) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function md(source: string): string {
  const html = marked.parse(source, { gfm: true, async: false }) as string;
  return html
    .replace(/<table>/g, '<div class="tbl"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<h2>(.*?)<\/h2>/g, (_m, t: string) => `<h2 id="${slug(t)}">${t}</h2>`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function load(name: string): Skill {
  const dir = join(SKILLS_DIR, name);
  const text = readFileSync(join(dir, 'SKILL.md'), 'utf8');
  const { data, metadata, body } = parse(text);
  const description = data.description ?? '';

  // House rule (AGENTS.md): the description is "what it does", then one "Use when ..." sentence
  // whose situations each start with an -ing verb, then optional "For X use ..." sentences.
  const cut = description.search(/\bUse (?:it |this |this skill )?when(?:ever)?\b/i);
  const what = (cut === -1 ? description : description.slice(0, cut)).trim();
  const summary = (/^(.+?[.!?])(\s|$)/.exec(what)?.[1] ?? what).trim();
  const whenSentence = cut === -1 ? '' : (/^(.+?\.)(\s|$)/.exec(description.slice(cut))?.[1] ?? description.slice(cut));
  const when = whenSentence
    .replace(/^Use (?:it |this |this skill )?when(?:ever)?\s*/i, '')
    .replace(/\.\s*$/, '')
    .split(/,\s*(?:or\s+)?(?=(?:when\s+)?[a-z]+ing\b)/)
    .map((s) => cap(s.trim()))
    .filter(Boolean);

  const showcasePath = join(CONTENT_DIR, `${name}.json`);
  const showcase: Showcase | null = existsSync(showcasePath) ? JSON.parse(readFileSync(showcasePath, 'utf8')) : null;
  const headings: Heading[] = [...body.matchAll(/^## (.+)$/gm)].map((m) => ({ id: slug(m[1]), text: m[1] }));

  return {
    name,
    title: /^# (.+)$/m.exec(body)?.[1] ?? name,
    description,
    what,
    summary,
    when,
    license: data.license ?? 'MIT',
    domain: domains.find((d) => d.id === metadata.domain) ?? { id: 'other', label: 'Other', blurb: '' },
    lines: text.split('\n').length,
    files: walk(dir).map((f) => relative(dir, f)).filter((f) => !f.startsWith('.')).sort(),
    bodyHtml: md(body.replace(/^# .+$/m, '')),
    headings,
    showcase,
  };
}

let cache: Skill[] | null = null;
export function allSkills(): Skill[] {
  cache ??= readdirSync(SKILLS_DIR)
    .filter((n) => !n.startsWith('.') && existsSync(join(SKILLS_DIR, n, 'SKILL.md')))
    .sort()
    .map(load);
  return cache;
}

export function getSkill(name: string): Skill | undefined {
  return allSkills().find((s) => s.name === name);
}

// Domains that have at least one skill, in the order of domains.json.
export function skillsByDomain(): { domain: Domain; skills: Skill[] }[] {
  const all = allSkills();
  const known = domains.map((d) => ({ domain: d, skills: all.filter((s) => s.domain.id === d.id) }));
  const other = all.filter((s) => s.domain.id === 'other');
  if (other.length) known.push({ domain: other[0].domain, skills: other });
  return known.filter((g) => g.skills.length);
}

export const installCommand = (name?: string) =>
  `npx skills@latest add ${REPO}${name ? ` --skill ${name}` : ''}`;
