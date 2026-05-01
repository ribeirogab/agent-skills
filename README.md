# agent-skills

Reusable [agent skills](https://skills.sh) for any tool that supports the open agent skills standard — Claude Code, Codex, Cursor, OpenCode, Gemini CLI, Aider, Cline, Augment, and others. Skills are framework-agnostic by design: a skill is a folder with a `SKILL.md` and any helpers it needs; agents discover them by description.

> Personal project, solo maintenance, best-effort, no SLA. Published so anyone can pull a skill into their setup.

---

## Skills

### `harness`

Idempotently scaffolds an agent harness into any repository — a `context/` knowledge vault, an `AGENTS.md` (with a `CLAUDE.md` symlink for back-compat), spec/plan/task templates, plus a set of bundled `harness-*` slash commands (open-pr, learn, spec, review-spec, sweep) and companion skills (brainstorming, recall, writing-plans). Audit-first, autonomous-fix, with a Phase-5 validator. Safe to re-run.

**Install:**

```bash
npx skills add ribeirogab/agent-skills --skill harness
```

**Use:** point an agent at any repo where you want the harness installed.

> "Audit the harness in this repo and scaffold whatever is missing."

After the first run the repo has a working `context/` vault, the `harness-*` commands, and the companion skills, all dogfood-tested by the harness's own 13-check validator.

**Source:** [`skills/harness/`](skills/harness/)

---

### `skill-improver`

Audits an existing agent skill against the canonical authoring rules (frontmatter, layout, body style, progressive disclosure, description quality, degrees of freedom) and applies safe fixes autonomously. Defers high-regression-risk findings for manual review. Self-contained — bundles vendored copies of `quick_validate.py` and `package_skill.py` so it does not require the upstream `skill-creator` to be installed.

**Install:**

```bash
npx skills add ribeirogab/agent-skills --skill skill-improver
```

**Use:** point it at any skill folder.

> "Audit the skill at `.claude/skills/my-skill` and apply safe fixes."

The skill walks a 10-section canonical checklist, applies anything `Low` or `Medium` regression-risk autonomously, and produces a final report with a `Skipped` section for `High`-risk findings the maintainer should review by hand.

**Source:** [`skills/skill-improver/`](skills/skill-improver/)

---

## Install — general notes

The [`skills` CLI](https://github.com/vercel-labs/skills) is the canonical way to install any skill from this repo into any supported agent's discovery directory (`.claude/skills/`, `.codex/skills/`, `.cursor/skills/`, `.opencode/skills/`, etc.). Useful flags:

```bash
# install a specific skill from this repo
npx skills add ribeirogab/agent-skills --skill <skill-name>

# run interactively and pick from the menu
npx skills add ribeirogab/agent-skills

# global install — skill becomes available across every agent on the machine
npx skills add ribeirogab/agent-skills --skill <skill-name> -y -g
```

If the CLI is unavailable, manually copy or symlink the skill folder into your agent's discovery directory:

```bash
# inside the repo where you want the skill available
mkdir -p .claude/skills    # or .codex/skills, .cursor/skills, etc.
cp -r /path/to/agent-skills/skills/<skill-name> .claude/skills/<skill-name>
```

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
