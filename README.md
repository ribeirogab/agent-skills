# agent-skills

Reusable agent skills for any tool that supports the open agent skills standard — Claude Code, Codex, Cursor, OpenCode, Gemini CLI, Aider, Cline, Augment, and others. Skills are framework-agnostic by design: a skill is a folder with a `SKILL.md` and any helpers it needs; agents discover them by description.

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

**Source:** [`skills/harness/SKILL.md`](skills/harness/SKILL.md)

---

### `skill-improver`

Audits an existing agent skill against the canonical authoring rules (frontmatter, layout, body style, progressive disclosure, description quality, degrees of freedom) and applies safe fixes autonomously. Defers high-regression-risk findings for manual review. Self-contained — bundles vendored copies of `quick_validate.py` and `package_skill.py` so it does not require the upstream `skill-creator` to be installed.

**Install:**

```bash
npx skills add ribeirogab/agent-skills --skill skill-improver
```

**Use:** point it at any skill folder.

> "Audit the skill at `skills/my-skill` and apply safe fixes."

The skill walks a 10-section canonical checklist, applies anything `Low` or `Medium` regression-risk autonomously, and produces a final report with a `Skipped` section for `High`-risk findings the maintainer should review by hand.

**Source:** [`skills/skill-improver/SKILL.md`](skills/skill-improver/SKILL.md)

---

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

The repository also contains `.agents/`, `.claude/`, `context/`, and `evals/` — local-only dirs used by the maintainer to dogfood the harness, run skill evaluations, and store personal project notes. They are not part of the published surface and are not what `npx skills add` installs.

## License

This repository's original work is licensed under the [MIT License](LICENSE). Any vendored third-party content inside the published skills is governed by its upstream license; see [`NOTICE.md`](NOTICE.md) for the full attribution.

## Contributing

Pull requests welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for scope, the quality bar, and the per-PR checklist. By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Security concerns go to [`SECURITY.md`](SECURITY.md).
