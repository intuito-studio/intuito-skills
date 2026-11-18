# Intuito Skills: how this repo works

This repo is Intuito Studio's public library of agent skills. Each skill is a folder under `skills/` in the open Agent Skills format (agentskills.io), so it installs on Claude Code, Codex, Cursor, and other agents that read `SKILL.md`.

## Layout

```
skills/<name>/SKILL.md        one folder per skill, flat, no category folders
skills/<name>/*.md            optional reference files the SKILL.md links to
skills/<name>/scripts/        optional helper scripts (also references/ and assets/)
templates/SKILL.template.md   starting point for a new skill
scripts/new-skill.mjs         creates a skill folder from the template
scripts/sync-readme.mjs       rewrites the skill list in README.md
scripts/validate.mjs          checks every skill; CI runs it on each push and pull request
scripts/check-deploy.mjs      after a push, waits until the live site serves that commit
scripts/og-cards.mjs          renders the share cards into site/public/og/ (home and one per skill)
.claude-plugin/marketplace.json   makes the repo installable as a Claude Code plugin
domains.json                  the list of domains a skill can belong to
site/                         the website (Next.js static export, deployed by Netlify)
site/content/<name>.json      the demo and before/after shown on a skill's page
```

Keep `skills/` flat. The skills CLI and the Claude Code plugin loader both expect `skills/<name>/SKILL.md`. Domains (design, engineering, marketing) are never folders: a skill declares its domain in `metadata.domain`, and the README list and the website group by it. The README list is generated; a new skill needs no entry in `marketplace.json`, because the plugin loads everything under `skills/`.

## When the user hands you a skill to add

The input may be a rough idea, a prompt, notes, or an existing skill from another folder.

1. Read `skills/write-skill/SKILL.md` and follow it. It is the authoring standard for this repo. Set `metadata.domain` to an id from `domains.json`; if none fits, ask the user before adding a domain.
2. Pick the name: lowercase, hyphenated, verb first where it reads naturally (`review-contract`, `write-skill`). Check that no existing skill already does the job; if one does, extend it.
3. Run `node scripts/new-skill.mjs <name>` and write the skill.
4. If the skill came from the user's machine, remove everything private first: client names, internal URLs, secrets, absolute paths, and references to tools only the user has. If the skill depends on such a tool, say so and ask before publishing it.
5. Check that every command, API name, and value in the skill is correct by running it or reading the current documentation.
6. Test the skill with a fresh agent that has no context, as step 5 of write-skill describes. Keep the request you gave it and what it produced.
7. Run the same request once more with an agent that does not have the skill. Give it the same tools and the same freedom to create files and run code, so the skill is the only difference. Keep that result too.
8. Write `site/content/<name>.json` from those two runs (see "The website" below).
9. Run `node scripts/og-cards.mjs` to render the share cards (the home card counts the skills, so it changes too). It needs `npm install` in `site/` and Chrome on the machine.
10. Run `node scripts/sync-readme.mjs`, then `node scripts/validate.mjs`, then `npm run build` in `site/`. Fix every reported problem, and report the test result to the user.
11. Commit only when the user asks. One skill per commit, with the message `Add /<name> skill` or `Update /<name>: <what changed>`.

## When updating a skill

Change the skill, run the two scripts, and re-run the fresh-agent test if the workflow or the description changed. If the behaviour changed, redo the two runs and update `site/content/<name>.json`. If the name, domain or "Use when" sentence changed, run `node scripts/og-cards.mjs` again. Renaming or deleting a skill breaks installs that reference it, so ask the user first.

## The website

`site/` builds one page per skill from `skills/<name>/SKILL.md` plus `site/content/<name>.json`. Nothing on a page is typed twice: change the skill and the page follows. Run it locally with `npm install` then `npm run dev` in `site/`. Netlify builds it from `netlify.toml` on every push to `main`.

`site/content/<name>.json` holds what a visitor needs to decide whether to install:

```json
{
  "demo": { "prompt": "what the user said", "result": "Markdown: what the agent produced", "caption": "optional" },
  "before": { "label": "Same request, no skill", "text": "Markdown", "note": "optional" },
  "after": { "label": "With <name>", "text": "Markdown", "note": "optional" },
  "method": "One sentence: how the two results were produced (runs, model, date)."
}
```

Rules for that file:

- The demo, the before, and the after come from real runs (steps 6 and 7). Do not write an invented or exaggerated "before".
- If the result without the skill was already good, say so, and show only the differences that were real.
- Keep each side short enough to compare at a glance: five points or one short excerpt.
- Nothing private: the same rule as for the skill itself.

The page splits the description's "Use when ..." sentence into a list, so write that sentence as situations that each start with an "-ing" verb, separated by commas: "Use when creating X, fixing Y, or reviewing Z."

## House rules the validator enforces

- Folder name equals `name`: 1 to 64 characters of `a-z`, `0-9`, and single hyphens.
- Frontmatter has only the six spec keys: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. No product-specific keys such as `disable-model-invocation`, because other agents and the claude.ai upload reject them.
- `description` is 80 to 1024 characters, says what the skill does, and has a "Use when ..." sentence. Its first sentence becomes the skill's line in the README, so keep that sentence short.
- `metadata` values are quoted strings.
- The body has a `# Title` and stays under 500 lines.
- Links point only to files inside the skill's own folder, and those files exist. A skill is installed on its own, so it cannot link to another skill's files; refer to another skill by name.
- No template placeholders, no absolute paths from a personal machine (checked in scripts too; scripts are otherwise not checked, so run them yourself).
- `metadata.domain` is an id from `domains.json`.
- `site/content/<name>.json` exists with a demo, a before, an after, and a method.
- `site/public/og/<name>.png` exists (the skill's share card).
- The README skill list matches `skills/`.

## Rules the validator cannot check

- One skill does one job.
- Nothing private or client-specific is published.
- Facts are verified, and the skill was tested by a fresh agent.
- The wording does not assume one product: write "the agent" and "ask the user".

## Do not

- Do not add skills written by other people unless their licence allows it and the README credits them.
- Do not add `plugin.json` next to the marketplace file without reading the Claude Code plugin docs on `strict`; a manifest plus component fields in the marketplace entry stops the plugin from loading.
- Do not push, tag, or open pull requests unless the user asks.

## After a push

Netlify rebuilds the site on every push to `main`. Run `node scripts/check-deploy.mjs` after pushing: it reads `https://skills.intuito.dev/health` until the `commit` there equals `origin/main`, and exits 1 if that does not happen within ten minutes. Report the result to the user. Pass another address as the first argument to check a different deploy.
