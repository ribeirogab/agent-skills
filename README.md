# agent-skills

A collection of reusable [agent skills](https://skills.sh) for any tool that supports the open agent skills standard — Claude Code, Codex, Cursor, OpenCode, Gemini CLI, Aider, Cline, Augment, and others. Skills are framework-agnostic by design: a skill is a folder with a `SKILL.md` and any helpers it needs; agents discover them by description.

The catalog (always reflects what's actually under [`skills/`](skills/)):

- **[`harness`](skills/harness/)** — idempotently scaffolds an agent harness into any repo. Adds a `context/` knowledge vault, an `AGENTS.md` (with a `CLAUDE.md` symlink for back-compat), spec/plan/task templates, plus a set of bundled `harness-*` slash commands (open-pr, learn, spec, review-spec, sweep) and companion skills (brainstorming, recall, writing-plans). Audit-first, autonomous-fix, with a Phase-5 validator. Safe to re-run.
- **[`skill-improver`](skills/skill-improver/)** — audits an existing agent skill against the canonical authoring rules (frontmatter, layout, body style, progressive disclosure, description quality, degrees of freedom) and applies safe fixes autonomously. Defers high-regression-risk findings for manual review. Self-contained — bundles vendored copies of `quick_validate.py` and `package_skill.py`.

> Personal project, solo maintenance, best-effort, no SLA. Published so anyone can pull a skill into their setup.

## Install

Skills are installable via the [skills CLI](https://github.com/vercel-labs/skills) (one command, works with any supported agent):

```bash
# install a specific skill from this repo
npx skills add ribeirogab/agent-skills --skill <skill-name>

# run interactively and pick from the menu
npx skills add ribeirogab/agent-skills

# global install (available across all agents on the machine)
npx skills add ribeirogab/agent-skills --skill <skill-name> -y -g
```

The CLI clones the repo, lets you pick the skill, and writes the right files into your agent's discovery directory (`.claude/skills/`, `.codex/skills/`, `.cursor/skills/`, etc.) automatically. No per-agent install steps.

If you prefer manual install, copy or symlink the skill folder yourself:

```bash
# inside the repo where you want the skill available
mkdir -p .claude/skills    # or .codex/skills, .cursor/skills, etc.
cp -r /path/to/agent-skills/skills/harness .claude/skills/harness
```

## Use

Once installed, the agent picks up the skill automatically when its description matches your prompt — there is no slash command needed.

For `harness`, run it once per target repo to scaffold the agent infrastructure:

> "Audit the harness in this repo and scaffold whatever's missing."

(or just say `/harness` once if your agent surfaces the skill name as a command.)

For `skill-improver`, point it at an existing skill folder:

> "Audit the skill at `.claude/skills/my-skill` and apply safe fixes."

## Repository layout

What matters for users is just `skills/`. Each subfolder is one publishable skill:

```
agent-skills/
├── skills/
│   ├── harness/
│   └── skill-improver/
├── LICENSE                    # MIT, this repository's original work
├── NOTICE.md                  # attribution for any vendored content inside skills/
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── README.md
```

The repository also contains `.claude/`, `context/`, and `evals/` — local-only dirs used by the maintainer to dogfood the harness, run skill evaluations, and store personal project notes. They are not part of the published surface and are not what `npx skills add` installs.

## Authoring or extending

The canonical authoring rules — frontmatter contract, directory layout, body-style conventions, progressive disclosure, degrees-of-freedom — are baked into `skill-improver`. The fastest path to a clean skill is to invoke `skill-improver` against your draft and let it tell you what to fix. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full quality bar and PR checklist.

## License

This repository's original work is licensed under the [MIT License](LICENSE). Any vendored third-party content inside the published skills is governed by its upstream license; see [`NOTICE.md`](NOTICE.md) for the full attribution.

## Contributing

Pull requests welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for scope, the quality bar, and the per-PR checklist. By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Security concerns go to [`SECURITY.md`](SECURITY.md).
