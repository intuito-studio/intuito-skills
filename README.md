# Intuito Skills

[![skills.sh](https://skills.sh/b/intuito-studio/intuito-skills)](https://skills.sh/intuito-studio/intuito-skills)

Agent skills written and used by [Intuito Studio](https://intuitostudio.com). Each one is a plain `SKILL.md` folder in the open [Agent Skills](https://agentskills.io) format, so it installs into Claude Code, Codex, Cursor, and other agents that read skills.

## Install

All agents, with the [skills CLI](https://skills.sh):

```bash
npx skills@latest add intuito-studio/intuito-skills
```

One skill only:

```bash
npx skills@latest add intuito-studio/intuito-skills --skill write-skill
```

Claude Code, as a plugin:

```
/plugin marketplace add intuito-studio/intuito-skills
/plugin install intuito-skills@intuito
```

claude.ai: zip one skill folder (for example `skills/write-skill`) and upload it under Customize > Skills. Code execution must be turned on in Settings > Capabilities.

Update later with `npx skills@latest update`.

## Skills

<!-- skills:start -->

### Agent tooling

- **[write-skill](skills/write-skill/SKILL.md)**: Write or revise an agent skill (a SKILL.md folder) so that any agent can find it, trigger it at the right moment, and follow it to a correct result.

<!-- skills:end -->

## Contributing a skill

The standard every skill here follows is itself a skill: [write-skill](skills/write-skill/SKILL.md). The repo workflow is in [AGENTS.md](AGENTS.md).

```bash
node scripts/new-skill.mjs my-skill   # create skills/my-skill/SKILL.md from the template
node scripts/sync-readme.mjs          # refresh the list above
node scripts/validate.mjs             # check every skill; CI runs the same check
```

## Website

`site/` is the website: one page per skill with a demo and a before and after, built from the files in this repo.

```bash
cd site && npm install && npm run dev
```

## License

[MIT](LICENSE)
