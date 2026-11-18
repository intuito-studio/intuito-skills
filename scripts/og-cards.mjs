#!/usr/bin/env node
// Renders the share cards (og:image) for the website: one for the home page and one per skill,
// into site/public/og/. Built with this repo's own og-image-create skill: its template supplies
// the zone check, and its render script takes the screenshot.
//
//   node scripts/og-cards.mjs            every card
//   node scripts/og-cards.mjs write-skill home
//
// Needs the site's dev dependencies (npm install in site/) and Chrome, or OG_BROWSER_PATH.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, SKILLS_DIR, DOMAINS, skillDirs, readSkill, summary } from './lib.mjs';

const SITE = join(ROOT, 'site');
const OUT = join(SITE, 'public', 'og');
const SKILL = join(SKILLS_DIR, 'og-image-create');
const FONTS = pathToFileURL(join(SITE, 'og', 'fonts')).href;
const REPO = 'intuito-studio/intuito-skills';

// The zone check comes from the skill's template, so the zones are defined in one place.
const template = readFileSync(join(SKILL, 'assets', 'card-template.html'), 'utf8');
const checkScript = /<script>[\s\S]*<\/script>/.exec(template)[0];

// Dark tokens from the site's stylesheet: the first :root block, copied, not retyped.
const tokens = /:root\s*\{[^}]*\}/.exec(readFileSync(join(SITE, 'app', 'globals.css'), 'utf8'))[0];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const CSS = `
@font-face { font-family: "Fraunces"; font-weight: 100 900; src: url(${FONTS}/fraunces-latin.woff2) format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 100 900; src: url(${FONTS}/inter-latin.woff2) format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 100 800; src: url(${FONTS}/jetbrains-mono-latin.woff2) format("woff2"); }
${tokens}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; font-family: "Inter", system-ui, sans-serif; color: var(--i-ink); background: var(--i-bg); }
.top { position: absolute; left: 315px; width: 570px; top: 34px; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; }
.logo { font-family: "Fraunces", serif; font-weight: 400; font-size: 32px; letter-spacing: -.01em; white-space: nowrap; }
.logo span { color: var(--i-ink-2); }
.headline { margin-top: 16px; width: 570px; font-family: "Fraunces", serif; font-weight: 340; line-height: 1.05; letter-spacing: -.03em; text-wrap: balance; }
.headline.mono { font-family: "JetBrains Mono", monospace; font-weight: 500; letter-spacing: -.04em; line-height: 1.1; overflow-wrap: anywhere; }
.em { color: var(--i-accent); }
.sub { margin-top: 12px; max-width: 570px; font-weight: 500; font-size: 22px; line-height: 1.3; color: var(--i-ink-2); text-wrap: balance; }
.badge { position: absolute; z-index: 3; width: 200px; border: 1px solid var(--i-ink-3); border-radius: 10px; padding: 12px 16px 13px; background: var(--i-bg-2); }
.badge b { display: block; font-family: "Fraunces", serif; font-weight: 400; font-size: 30px; line-height: 1.1; letter-spacing: -.02em; white-space: nowrap; color: var(--i-accent); }
.badge span { display: block; font-family: "JetBrains Mono", monospace; font-size: 14px; line-height: 1.25; text-transform: uppercase; letter-spacing: .12em; color: var(--i-ink-2); margin-top: 4px; }
.s0, .s1 { left: 60px; } .s2, .s3 { right: 60px; } .s0, .s2 { top: 96px; } .s1, .s3 { top: 200px; }
.art { position: absolute; left: 50%; transform: translateX(-50%); z-index: 1; width: 620px; min-height: 420px; border: 1px solid var(--i-ink-3); border-bottom: 0; border-radius: 14px 14px 0 0; background: var(--i-bg-2); box-shadow: 0 0 80px rgba(230, 212, 156, .10); padding: 26px 30px; }
.eyebrow { font-family: "JetBrains Mono", monospace; font-size: 13px; text-transform: uppercase; letter-spacing: .14em; color: var(--i-ink-2); }
.cmd { margin-top: 10px; border: 1px solid var(--i-line); border-radius: 8px; background: var(--i-bg); padding: 13px 16px; font-family: "JetBrains Mono", monospace; font-size: 17px; white-space: nowrap; overflow: hidden; }
.cmd i { font-style: normal; color: var(--i-ink-3); }
.cmd.wrap { white-space: normal; overflow-wrap: anywhere; font-size: 16px; line-height: 1.45; }
.rows { list-style: none; margin-top: 18px; }
.rows li { display: flex; gap: 14px; padding: 11px 0; border-top: 1px solid var(--i-line); font-size: 19px; line-height: 1.3; }
.rows li b { flex: none; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 17px; color: var(--i-accent); }
.zone { position: absolute; z-index: 9; pointer-events: none; box-sizing: border-box; }
.zone.sq { left: 285px; top: 0; width: 630px; height: 630px; border: 3px dashed #ff2d95; }
.zone.must { left: 315px; top: 24px; width: 570px; height: 566px; border: 2px solid #00b8d4; }
.zone.strip { left: 0; width: 1200px; background: rgba(255, 45, 149, .25); }
`;

const page = ({ title, headline, sub, badges, art }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>
<div class="top">
  <div class="logo" data-og="must">Intuito&nbsp;<span>Skills</span></div>
  ${headline}
  <div class="sub" data-og="must">${esc(sub)}</div>
</div>
${badges.map((b, i) => `<div class="badge s${i}" data-og="side"><b>${esc(b[0])}</b><span>${esc(b[1])}</span></div>`).join('')}
<div class="art" data-og="art" data-opaque data-gap="26" data-subject="0,0,1,0.3">${art}</div>
${checkScript}</body></html>`;

// The "Use when ..." sentence of a description, split into situations (same rule as the site).
function useWhen(description) {
  const cut = description.search(/\bUse (?:it |this |this skill )?when(?:ever)?\b/i);
  if (cut === -1) return [];
  const sentence = /^(.+?\.)(\s|$)/.exec(description.slice(cut))?.[1] ?? description.slice(cut);
  return sentence.replace(/^Use (?:it |this |this skill )?when(?:ever)?\s*/i, '').replace(/\.\s*$/, '')
    .split(/,\s*(?:or\s+)?(?=(?:when\s+)?[a-z]+ing\b)/).map((s) => cap(s.trim())).filter(Boolean);
}

const skills = skillDirs().map((name) => {
  const s = readSkill(name);
  const domain = DOMAINS.find((d) => d.id === s.data.metadata?.domain?.value);
  return { name, description: s.data.description, domain: domain?.label ?? 'Other', license: s.data.license ?? 'MIT', files: readdirSync(join(SKILLS_DIR, name), { recursive: true }).filter((f) => /\.[a-z]+$/i.test(String(f))).length };
});
const usedDomains = new Set(skills.map((s) => s.domain)).size;

const cards = [
  {
    id: 'home',
    html: page({
      title: 'Intuito Skills',
      headline: '<div class="headline" data-og="must" data-size="54">Agent skills we wrote for our own work, <span class="em">free to install.</span></div>',
      sub: 'For Claude Code, Codex, Cursor and other agents',
      badges: [[String(skills.length), 'Skills'], ['MIT', 'Licence'], [String(usedDomains), usedDomains === 1 ? 'Domain' : 'Domains'], ['SKILL.md', 'Open format']],
      art: `<div class="eyebrow">Install all of them</div><div class="cmd"><i>$ </i>npx skills@latest add ${REPO}</div><ul class="rows">${skills.map((s) => `<li><b>${esc(s.name)}</b></li>`).join('')}</ul>`,
    }),
  },
  ...skills.map((s) => ({
    id: s.name,
    html: page({
      title: s.name,
      headline: `<div class="headline mono" data-og="must" data-size="52">${esc(s.name)}</div>`,
      sub: `Agent skill · ${s.domain}`,
      badges: [[s.domain, 'Domain'], [s.license, 'Licence'], [String(s.files), s.files === 1 ? 'File' : 'Files'], ['SKILL.md', 'Open format']],
      art: `<div class="eyebrow">Use it when</div><ul class="rows">${useWhen(s.description).slice(0, 4).map((w) => `<li>${esc(w)}</li>`).join('')}</ul><div class="eyebrow" style="margin-top:22px">Install</div><div class="cmd wrap"><i>$ </i>npx skills@latest add ${REPO} --skill ${esc(s.name)}</div>`,
    }),
  })),
];

const only = new Set(process.argv.slice(2));
const todo = cards.filter((c) => only.size === 0 || only.has(c.id));
if (!todo.length) { console.error('No card matches: ' + [...only].join(', ')); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const tmp = join(SITE, '.og-tmp');
mkdirSync(tmp, { recursive: true });
let failed = 0;
try {
  for (const c of todo) {
    const htmlPath = join(tmp, c.id + '.html');
    writeFileSync(htmlPath, c.html);
    const out = join(OUT, c.id + '.png');
    const r = spawnSync(process.execPath, [join(SKILL, 'scripts', 'render.mjs'), htmlPath, out], { cwd: SITE, encoding: 'utf8' });
    for (const extra of ['.square.png', '.small.png']) rmSync(join(OUT, c.id + extra), { force: true });
    if (r.status !== 0) { failed++; console.error(`✗ ${c.id}\n${(r.stdout + r.stderr).trim()}`); }
    else console.log(`✓ site/public/og/${c.id}.png  ${/\((\d+ KB)\)/.exec(r.stdout)?.[1] ?? ''}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
