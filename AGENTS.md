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
.claude-plugin/marketplace.json   makes the repo installable as a Claude Code plugin
```

Keep `skills/` flat. The skills CLI and the Claude Code plugin loader both expect `skills/<name>/SKILL.md`. Areas (design, engineering, operations) are never folders. The README list is flat and generated; a new skill needs no entry in `marketplace.json`, because the plugin loads everything under `skills/`.

## When the user hands you a skill to add

The input may be a rough idea, a prompt, notes, or an existing skill from another folder.

1. Read `skills/write-skill/SKILL.md` and follow it. It is the authoring standard for this repo.
2. Pick the name: lowercase, hyphenated, verb first where it reads naturally (`review-contract`, `write-skill`). Check that no existing skill already does the job; if one does, extend it.
3. Run `node scripts/new-skill.mjs <name>` and write the skill.
4. If the skill came from the user's machine, remove everything private first: client names, internal URLs, secrets, absolute paths, and references to tools only the user has. If the skill depends on such a tool, say so and ask before publishing it.
5. Check that every command, API name, and value in the skill is correct by running it or reading the current documentation.
6. Run `node scripts/sync-readme.mjs`, then `node scripts/validate.mjs`. Fix every reported problem.
7. Test the skill with a fresh agent that has no context, as step 5 of write-skill describes. Report the result to the user.
8. Commit only when the user asks. One skill per commit, with the message `Add /<name> skill` or `Update /<name>: <what changed>`.

## When updating a skill

Change the skill, run the two scripts, and re-run the fresh-agent test if the workflow or the description changed. Renaming or deleting a skill breaks installs that reference it, so ask the user first.

## House rules the validator enforces

- Folder name equals `name`: 1 to 64 characters of `a-z`, `0-9`, and single hyphens.
- Frontmatter has only the six spec keys: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. No product-specific keys such as `disable-model-invocation`, because other agents and the claude.ai upload reject them.
- `description` is 80 to 1024 characters, says what the skill does, and has a "Use when ..." sentence. Its first sentence becomes the skill's line in the README, so keep that sentence short.
- `metadata` values are quoted strings.
- The body has a `# Title` and stays under 500 lines.
- Links point only to files inside the skill's own folder, and those files exist. A skill is installed on its own, so it cannot link to another skill's files; refer to another skill by name.
- No template placeholders, no absolute paths from a personal machine (checked in scripts too; scripts are otherwise not checked, so run them yourself).
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
