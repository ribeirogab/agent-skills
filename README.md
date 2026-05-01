# agent-skills

A personal-but-shareable collection of [Claude Code](https://claude.com/claude-code) skills and slash commands. The flagship is `harness`, an idempotent scaffolder that installs an agent infrastructure into any repo (project knowledge vault, AGENTS.md, spec templates, bundled skills, validated end-to-end). The rest of the collection sits around it: a skill auditor, a vault recall tool, a structured brainstorming companion, a plan writer, plus vendored copies of two well-known third-party skills.

> Solo project, best-effort maintenance, no SLA. The repository is published so other Claude Code users can lift any skill that is useful to them, fork the harness if they want their own variant, or contribute a new skill via PR.

## What's included

### Skills (this repo)

| Skill | Lives in | One-line summary |
|---|---|---|
| **harness** | `skills/harness/` (also exposed at `.claude/skills/harness` via symlink) | Idempotently scaffold or audit an agent harness in any repo — `context/` vault, AGENTS.md, spec templates, bundled `harness-*` skills and commands, with a 13-check Phase 5 validator. |
| **skill-improver** | `skills/skill-improver/` (also exposed at `.claude/skills/skill-improver`) | Audit an existing Claude Code skill against Anthropic's canonical authoring rules, apply safe fixes autonomously, defer high-regression-risk findings. Self-contained — bundles vendored copies of `quick_validate.py` and `package_skill.py`. |
| **harness-recall** | `.claude/skills/harness-recall/` | Quick reconnaissance of the project's `context/` vault — search learnings, conventions, rules, and specs from a single entry point. |
| **harness-brainstorming** | `.claude/skills/harness-brainstorming/` | Structured brainstorming flow that runs before any spec is written, with a small visual companion server. |
| **harness-writing-plans** | `.claude/skills/harness-writing-plans/` | Turn an approved spec into a `plan.md` and `tasks.md` ready for implementation. |

### Slash commands (this repo)

| Command | Summary |
|---|---|
| `/harness-spec` | Take the current conversation and run the spec flow, skipping already-discussed brainstorming questions. |
| `/harness-review-spec` | External evaluator pass — read a spec against the constitution and the vault, flag violations, vagueness, and duplication. |
| `/harness-sweep` | Manual garbage collection over `context/` — orphan learnings, broken wikilinks, stale specs, uncited rules, empty MOC sections. |
| `/harness-learn` | Investigate a topic in the project and save the findings as a learning note in `context/learnings/`. |
| `/harness-open-pr` | Open a pull request with auto-generated title and description that follow the repo's conventions. |

### Vendored third-party skills

Both are kept verbatim (one minimal modification documented in [`NOTICE.md`](NOTICE.md)). Their original licenses are preserved alongside the skill content.

| Skill | Source | Upstream license |
|---|---|---|
| **skill-creator** | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skill-creator) | Apache-2.0 |
| **opensource-guide-coach** | [xixu-me/skills](https://github.com/xixu-me/skills/tree/main/skills/opensource-guide-coach) | MIT |

## Install a skill

Skills are plain folders. To use one in another repo, copy or symlink it into that repo's `.claude/skills/`:

```bash
# From inside the target repo
mkdir -p .claude/skills

# Option A: copy (independent, no upstream tracking)
cp -r /path/to/agent-skills/skills/skill-improver .claude/skills/skill-improver

# Option B: symlink (tracks updates as agent-skills evolves; useful when you also clone this repo)
ln -s /absolute/path/to/agent-skills/skills/skill-improver .claude/skills/skill-improver
```

Then start (or restart) Claude Code in the target repo. The skill is loaded automatically whenever its description matches your prompt — there is no separate "enable" step.

For the `harness` skill specifically, run `/harness` inside any target repo after installation to scaffold the full agent infrastructure (vault, AGENTS.md, spec templates, bundled `harness-*` commands).

## Authoring a new skill

The canonical authoring rules — Anthropic's frontmatter contract, directory layout, body-style conventions, progressive disclosure, degrees-of-freedom — are documented in this repo's project knowledge base under `context/conventions/skill-*.md` and enforced by `skill-improver`. To add a new skill that follows them:

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) — it explains the contribution scope (skills yes, vault no), the quality bar, and the PR checklist.
2. Author your skill under `skills/<name>/` with a `SKILL.md` and any `references/`, `scripts/`, or `assets/` it needs.
3. Run `python skills/skill-improver/scripts/quick_validate.py skills/<name>` and `python skills/skill-improver/scripts/package_skill.py skills/<name> /tmp` until both succeed.
4. Open a PR.

## Repository layout

```
agent-skills/
├── skills/                        # Original skills (the canonical source for this repo)
│   ├── harness/
│   └── skill-improver/
├── .claude/                       # Claude Code's discovery directory
│   ├── skills/
│   │   ├── harness                # symlink → ../../skills/harness
│   │   ├── skill-improver         # symlink → ../../skills/skill-improver
│   │   ├── harness-brainstorming/
│   │   ├── harness-recall/
│   │   ├── harness-writing-plans/
│   │   ├── opensource-guide-coach/  # vendored, MIT (Xi Xu)
│   │   └── skill-creator/         # vendored, Apache-2.0 (Anthropic)
│   └── commands/                  # /harness-* slash commands
├── context/                       # Personal knowledge vault (NOT for external contribution)
├── evals/                         # Eval fixtures and (gitignored) workspace results
├── LICENSE                        # MIT, this repository's original work
├── NOTICE.md                      # Vendored content attribution
├── README.md                      # this file
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── SECURITY.md
```

## License

This repository's original work is licensed under the [MIT License](LICENSE). The two vendored third-party skills retain their original licenses; see [`NOTICE.md`](NOTICE.md) for the full attribution and any modifications.

## Contributing

Pull requests welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for scope, the quality bar, and the per-PR checklist. By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Security concerns go to [`SECURITY.md`](SECURITY.md).
