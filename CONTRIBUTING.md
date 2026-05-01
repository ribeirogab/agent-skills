# Contributing

Thanks for considering a contribution to `agent-skills`. The repository accepts pull requests for new skills and improvements to existing ones, with a small quality bar that this document explains.

The maintenance model is **solo, best-effort, no SLA**. Pull requests are reviewed when the maintainer is available; complex changes may take time to land. Please do not interpret silence as rejection — a polite ping after a couple of weeks is welcome.

## Scope

### What is in scope

- **New skills** under `skills/<name>/` that follow Anthropic's canonical authoring rules.
- **Bug fixes** to existing skills under `skills/` and `.claude/skills/` (the bundled `harness-*` skills, the harness scaffolder, `skill-improver`).
- **Bug fixes** to slash commands under `.claude/commands/`.
- **Documentation fixes** to `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `NOTICE.md`.
- **Vendored skill updates**: refreshing `skill-creator` or `opensource-guide-coach` to a newer upstream version, with the `NOTICE.md` row updated to reflect the new source commit/tag.

### What is out of scope

- **`context/` is the maintainer's personal knowledge vault.** Pull requests that add, modify, or remove files under `context/` (constitution, learnings, conventions, rules, specs, MOCs) will be closed without merge. The vault contains opinionated personal notes that need to evolve as the maintainer learns; it is not a community resource.
- **`evals/skill-improver/workspace/` is runtime output** — gitignored. Any PR touching it indicates a misunderstanding.
- **Personal memory**, IDE configs, or anything specific to the maintainer's local setup.
- **Governance proposals**, maintainer hierarchies, decision-making frameworks, funding models, sponsorship, and similar process documents. The project is intentionally solo and lightweight.

## How to add a skill

1. **Pick a name.** Use kebab-case (`my-skill`, not `MySkill` or `my_skill`). Avoid the reserved prefixes `claude-` and `anthropic-`. Avoid generic names like `helper`, `utils`, `tools`.

2. **Author the skill** under `skills/<name>/` following Anthropic's canonical layout:

   ```
   skills/<name>/
   ├── SKILL.md           # required — frontmatter (name + description) plus instructions
   ├── references/        # optional — long-form docs loaded on demand
   ├── scripts/           # optional — executable helpers the skill itself runs
   └── assets/            # optional — templates, fonts, schemas, static files
   ```

   Keep `SKILL.md` under 500 lines; push detail into `references/`. Write the description in third person and include both **what** the skill does and **when** it should trigger, with concrete trigger phrases. See `skill-improver`'s own `SKILL.md` and `references/audit-checklist.md` for a worked example.

3. **Decide whether to symlink into `.claude/skills/`.** If your skill should be dogfood-able from this repository (Claude Code in this checkout will load it), add `.claude/skills/<name>` as a symlink to `../../skills/<name>`. Most contributions should do this; the existing `harness` and `skill-improver` skills follow the pattern.

4. **Run the quality bar checks** (next section). Address every finding. If you cannot fix a finding, explain in the PR description why it should be accepted.

5. **Update `README.md`** to add a row for your skill in the appropriate "What's included" table.

6. **Open the PR** with the template's checklist filled in.

## Quality bar

Two mechanical checks must pass on any new or modified skill before the PR is opened. Both ship inside `skill-improver` and are vendored copies of Anthropic's canonical validators (Apache-2.0, see [`NOTICE.md`](NOTICE.md)):

```bash
python skills/skill-improver/scripts/quick_validate.py skills/<your-skill>
# expected output: "Skill is valid!"

python skills/skill-improver/scripts/package_skill.py skills/<your-skill> /tmp
# expected output: ends with "Successfully packaged skill to: /tmp/<your-skill>.skill"
```

`quick_validate.py` enforces the frontmatter contract (kebab-case `name`, `description` ≤ 1024 chars, no XML angle brackets, no reserved words, only canonical top-level keys). `package_skill.py` re-runs that validation and additionally confirms the skill packages cleanly into a `.skill` artifact (no broken file references, no excluded patterns left behind).

For a more thorough audit, invoke the `skill-improver` skill itself in a Claude Code session ("audit the skill at `skills/<your-skill>`"). It walks the full 10-section canonical checklist (folder/file naming, layout, body style, description quality, progressive disclosure, degrees of freedom, workflow patterns, scripts, anti-regression) and applies safe fixes autonomously.

The repository's own `skill-improver` SKILL.md is the closest internal reference for what an audited, well-shaped skill looks like.

## Pull request checklist

The PR template carries this checklist; the items below explain each entry.

- [ ] **Branch name** is descriptive and not `main`. Suggested prefixes: `feat/`, `fix/`, `docs/`.
- [ ] **`quick_validate.py` and `package_skill.py` pass** on every new or modified skill (or N/A — your PR doesn't touch a skill).
- [ ] **`README.md` updated** when adding a new skill (the `What's included` table needs the new row).
- [ ] **`NOTICE.md` updated** when vendoring or updating third-party content.
- [ ] **No edits under `context/`** (the personal vault is out of scope).
- [ ] **No edits under `evals/skill-improver/workspace/`** (runtime artifact, gitignored).
- [ ] **Commit messages** follow Conventional Commits style (`feat(<scope>): ...`, `fix(<scope>): ...`, `docs: ...`, `chore: ...`).
- [ ] **No `Co-Authored-By: Claude` footers** in commits or PR description (project convention).

## Reporting bugs

Open an issue using the bug-report template. Please include the skill name, the Claude Code version, exact reproduction steps, and what you expected to happen vs. what did happen. The smaller and more specific the report, the faster it can be addressed.

## Code of conduct

Participation in this project is governed by the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md). By contributing — whether via issues, PRs, or discussion — you agree to those standards.

## Security

Security concerns go to [`SECURITY.md`](SECURITY.md), not the public issue tracker.
